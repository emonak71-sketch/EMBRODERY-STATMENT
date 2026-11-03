import { createClient } from "npm:@supabase/supabase-js@2";

const APP_ORIGIN = "https://embroidery-statement-v10.vercel.app";

function allowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  if (origin === APP_ORIGIN || origin === "http://localhost:5173" || origin === "http://localhost:3000") return true;
  try {
    const host = new URL(origin).hostname;
    return new URL(origin).protocol === "https:" &&
      /^embroidery-statement-v10(?:-[a-z0-9-]+)?-emonak71-2297s-projects\.vercel\.app$/i.test(host);
  } catch {
    return false;
  }
}

function headers(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || APP_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function reply(body: Record<string, unknown>, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (!allowedOrigin(origin)) return reply({ ok: false, code: "ORIGIN_NOT_ALLOWED" }, 403, APP_ORIGIN);
  if (req.method === "OPTIONS") return new Response("ok", { headers: headers(origin) });
  if (req.method !== "POST") return reply({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405, origin);

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!projectUrl || !serviceKey || !turnstileSecret) {
    return reply({ ok: false, code: "RECOVERY_CHECK_NOT_CONFIGURED" }, 503, origin);
  }

  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const captchaToken = typeof body?.captchaToken === "string" ? body.captchaToken : "";
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply({ ok: false, code: "INVALID_EMAIL" }, 400, origin);
    }
    if (!captchaToken || captchaToken.length > 2048) {
      return reply({ ok: false, code: "CAPTCHA_REQUIRED" }, 400, origin);
    }

    const clientIp = req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const captchaBody = new URLSearchParams({ secret: turnstileSecret, response: captchaToken, remoteip: clientIp });
    const captchaResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: captchaBody,
    });
    const captchaResult = await captchaResponse.json();
    if (!captchaResponse.ok || captchaResult.success !== true) {
      return reply({ ok: false, code: "CAPTCHA_INVALID" }, 400, origin);
    }

    const [emailHash, ipHash] = await Promise.all([
      hmac("email:" + email, serviceKey),
      hmac("ip:" + clientIp, serviceKey),
    ]);
    const admin = createClient(projectUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: allowed, error: throttleError } = await admin.rpc("consume_password_recovery_attempt", {
      p_email_hash: emailHash,
      p_ip_hash: ipHash,
    });
    if (throttleError) {
      console.error("Password recovery throttle failed:", throttleError.message);
      return reply({ ok: false, code: "RECOVERY_CHECK_FAILED" }, 503, origin);
    }
    if (allowed !== true) return reply({ ok: false, code: "RATE_LIMITED" }, 429, origin);

    let exists = false;
    const perPage = 1000;
    for (let page = 1; page <= 100; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("Password recovery lookup failed:", error.message);
        return reply({ ok: false, code: "RECOVERY_CHECK_FAILED" }, 503, origin);
      }
      const users = data?.users || [];
      if (users.some((user) => (user.email || "").trim().toLowerCase() === email)) {
        exists = true;
        break;
      }
      if (users.length < perPage) break;
    }

    if (!exists) return reply({ ok: true, exists: false, code: "ACCOUNT_NOT_FOUND" }, 200, origin);
    return reply({ ok: true, exists: true }, 200, origin);
  } catch (error) {
    console.error("Password recovery check failed:", error instanceof Error ? error.message : "Unexpected error");
    return reply({ ok: false, code: "RECOVERY_CHECK_FAILED" }, 500, origin);
  }
});
