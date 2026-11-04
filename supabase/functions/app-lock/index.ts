import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const PBKDF2_ITERATIONS = 310_000;
const HASH_BYTES = 32;
const MAX_PASSWORD_LENGTH = 128;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function resolveAnonKey(): string | undefined {
  const direct = Deno.env.get("SUPABASE_ANON_KEY");
  if (direct) return direct;
  const keys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (!keys) return undefined;
  try { const parsed = JSON.parse(keys); return typeof parsed.default === "string" ? parsed.default : undefined; }
  catch { return undefined; }
}
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
}
function hexToBytes(hex: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) return new Uint8Array();
  return new Uint8Array(hex.match(/.{2}/g)!.map(value => parseInt(value, 16)));
}
function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length || left.length === 0) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i += 1) difference |= left[i] ^ right[i];
  return difference === 0;
}
async function derivePasswordHash(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, HASH_BYTES * 8);
  return new Uint8Array(bits);
}
async function createPasswordRecord(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordHash(password, salt, PBKDF2_ITERATIONS);
  return { password_salt: btoa(String.fromCharCode(...salt)), password_hash: bytesToHex(hash), iterations: PBKDF2_ITERATIONS };
}
async function passwordMatches(password: string, record: Record<string, unknown>): Promise<boolean> {
  const iterations = Number(record.iterations);
  if (!Number.isInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return false;
  let salt: Uint8Array;
  try { salt = Uint8Array.from(atob(String(record.password_salt || "")), character => character.charCodeAt(0)); }
  catch { return false; }
  if (salt.length !== 16) return false;
  const expected = hexToBytes(String(record.password_hash || ""));
  if (expected.length !== HASH_BYTES) return false;
  return constantTimeEqual(await derivePasswordHash(password, salt, iterations), expected);
}
function validatePassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= MAX_PASSWORD_LENGTH;
}
function getRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) return (data[0] as Record<string, unknown> | undefined) || null;
  return data && typeof data === "object" ? data as Record<string, unknown> : null;
}
async function getLockRecord(admin: any, userId: string) {
  const { data, error } = await admin.rpc("app_lock_get", { p_user_id: userId });
  if (error) throw new Error("Could not read App Lock settings.");
  return getRow(data);
}
async function saveLockRecord(admin: any, userId: string, password: string, createOnly = false): Promise<string | null> {
  const record = await createPasswordRecord(password);
  const rpcName = createOnly ? "app_lock_create" : "app_lock_upsert";
  const { data, error } = await admin.rpc(rpcName, {
    p_user_id: userId, p_password_salt: record.password_salt,
    p_password_hash: record.password_hash, p_iterations: record.iterations,
  });
  if (error) throw new Error("Could not save the App Lock password.");
  return data ? String(data) : null;
}
async function checkLockout(record: Record<string, unknown>) {
  const until = record.locked_until ? new Date(String(record.locked_until)).getTime() : 0;
  if (until > Date.now()) {
    const seconds = Math.ceil((until - Date.now()) / 1000);
    return jsonResponse({ ok: false, error: "Too many incorrect attempts. Try again after " + seconds + " seconds.", retryAfter: seconds }, 429);
  }
  return null;
}
async function recordFailure(admin: any, userId: string) {
  const { data, error } = await admin.rpc("app_lock_record_failure", { p_user_id: userId });
  if (error) throw new Error("Could not record the failed App Lock attempt.");
  return getRow(data);
}
async function clearFailures(admin: any, userId: string) {
  const { error } = await admin.rpc("app_lock_clear_failures", { p_user_id: userId });
  if (error) throw new Error("Could not reset App Lock attempt counter.");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return jsonResponse({ ok: false, error: "Sign in is required." }, 401);

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = resolveAnonKey();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !anonKey || !serviceRoleKey) return jsonResponse({ ok: false, error: "App Lock server configuration is incomplete." }, 500);

  const token = authorization.slice("Bearer ".length);
  const userClient = createClient(projectUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) return jsonResponse({ ok: false, error: "Your session is invalid. Sign in again." }, 401);
    const user = authData.user;
    const admin = createClient(projectUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return jsonResponse({ ok: false, error: "Invalid request." }, 400);
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "status") {
      const record = await getLockRecord(admin, user.id);
      return jsonResponse({ ok: true, enabled: Boolean(record), updatedAt: record?.updated_at || null });
    }

    if (action === "verify") {
      if (!validatePassword(body.password)) return jsonResponse({ ok: false, error: "Enter your App Lock password." }, 400);
      const record = await getLockRecord(admin, user.id);
      if (!record) return jsonResponse({ ok: false, error: "App Lock has not been set up for this account." }, 409);
      const blocked = await checkLockout(record);
      if (blocked) return blocked;
      if (!await passwordMatches(body.password, record)) {
        const failed = await recordFailure(admin, user.id);
        const attempts = Number(failed?.attempt_count || 0);
        const blockedUntil = failed?.blocked_until ? new Date(String(failed.blocked_until)).getTime() : 0;
        if (blockedUntil > Date.now()) return jsonResponse({ ok: false, error: "Too many incorrect attempts. Try again in 5 minutes.", retryAfter: 300 }, 429);
        return jsonResponse({ ok: false, error: "Incorrect App Lock password. " + Math.max(0, 5 - attempts) + " attempts remaining." }, 401);
      }
      await clearFailures(admin, user.id);
      return jsonResponse({ ok: true, updatedAt: record.updated_at });
    }

    if (action === "set" || action === "change") {
      if (!validatePassword(body.newPassword)) return jsonResponse({ ok: false, error: "New password must be 8–128 characters." }, 400);
      const record = await getLockRecord(admin, user.id);
      if (action === "set" && record) return jsonResponse({ ok: false, error: "App Lock is already set up. Enter it to unlock or use Change Password." }, 409);
      if (action === "change") {
        if (!record) return jsonResponse({ ok: false, error: "App Lock is not set up yet." }, 409);
        const blocked = await checkLockout(record);
        if (blocked) return blocked;
        if (!validatePassword(body.currentPassword) || !await passwordMatches(body.currentPassword, record)) {
          const failed = await recordFailure(admin, user.id);
          const attempts = Number(failed?.attempt_count || 0);
          const blockedUntil = failed?.blocked_until ? new Date(String(failed.blocked_until)).getTime() : 0;
          if (blockedUntil > Date.now()) return jsonResponse({ ok: false, error: "Too many incorrect attempts. Try again in 5 minutes." }, 429);
          return jsonResponse({ ok: false, error: "Current App Lock password is incorrect. " + Math.max(0, 5 - attempts) + " attempts remaining." }, 401);
        }
      }
      const updatedAt = await saveLockRecord(admin, user.id, body.newPassword, action === "set");
      if (!updatedAt) return jsonResponse({ ok: false, error: "App Lock was created on another device. Use that same password to unlock." }, 409);
      return jsonResponse({ ok: true, updatedAt });
    }

    if (action === "reset") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const otp = typeof body.otp === "string" ? body.otp.replace(/\D/g, "") : "";
      if (!email || email !== String(user.email || "").toLowerCase() || !/^\d{8}$/.test(otp)) {
        return jsonResponse({ ok: false, error: "Enter the account Gmail and its valid 8-digit OTP." }, 400);
      }
      if (!validatePassword(body.newPassword)) return jsonResponse({ ok: false, error: "New password must be 8–128 characters." }, 400);
      const otpClient = createClient(projectUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: otpData, error: otpError } = await otpClient.auth.verifyOtp({ email, token: otp, type: "recovery" });
      const verifiedUserId = otpData.user?.id || otpData.session?.user?.id;
      if (otpError || verifiedUserId !== user.id) return jsonResponse({ ok: false, error: "The Gmail OTP is invalid or expired. Request a new code." }, 400);
      const record = await getLockRecord(admin, user.id);
      if (!record) return jsonResponse({ ok: false, error: "App Lock is not set up for this account. Create it first." }, 409);
      const updatedAt = await saveLockRecord(admin, user.id, body.newPassword);
      if (!updatedAt) return jsonResponse({ ok: false, error: "Could not update App Lock." }, 500);
      return jsonResponse({ ok: true, updatedAt, message: "App Lock password reset successfully. Your account password was not changed." });
    }

    return jsonResponse({ ok: false, error: "Unsupported App Lock action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected App Lock service error.";
    console.error("App Lock request failed:", message);
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
