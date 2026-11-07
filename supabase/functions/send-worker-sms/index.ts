import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function defaultKey(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    return parsed.default as string | undefined;
  } catch {
    return undefined;
  }
}

function normalizeBangladeshMobile(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00880")) digits = digits.slice(2);
  if (digits.startsWith("01") && digits.length === 11) digits = "88" + digits;
  if (digits.startsWith("1") && digits.length === 10) digits = "880" + digits;
  if (!/^8801[3-9]\d{8}$/.test(digits)) return null;
  return digits;
}

function parseProviderBody(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
  } catch {
    // Keep a bounded plain-text response for diagnostics.
  }
  return { raw: raw.slice(0, 1200) };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed." }, 405);

  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return jsonResponse({ ok: false, error: "Sign in is required." }, 401);
  }

  const apiToken = Deno.env.get("DNOTIFY_API_TOKEN");
  if (!apiToken) {
    return jsonResponse({ ok: false, error: "DNotify is not configured. Add DNOTIFY_API_TOKEN in Supabase Edge Function Secrets." }, 503);
  }

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || defaultKey(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"));
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "Supabase server configuration is incomplete." }, 500);
  }

  try {
    const body = await req.json();
    const workerId = typeof body.worker_id === "string" ? body.worker_id : "";
    const eventType = body.event_type;
    const relatedId = typeof body.related_id === "string" ? body.related_id : null;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const customKey = typeof body.idempotency_key === "string" ? body.idempotency_key.trim() : "";

    if (!workerId || !["salary_paid", "advance_paid", "custom"].includes(eventType)) {
      return jsonResponse({ ok: false, error: "Invalid worker or SMS event." }, 400);
    }
    if (!message || message.length > 1000) {
      return jsonResponse({ ok: false, error: "SMS message must contain 1–1000 characters." }, 400);
    }
    if (eventType !== "custom" && !relatedId) {
      return jsonResponse({ ok: false, error: "A payroll or advance reference is required." }, 400);
    }
    if (eventType === "custom" && customKey && !/^[A-Za-z0-9:_-]{8,160}$/.test(customKey)) {
      return jsonResponse({ ok: false, error: "Invalid custom SMS request key." }, 400);
    }

    const token = authorization.slice("Bearer ".length);
    const userClient = createClient(projectUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) {
      return jsonResponse({ ok: false, error: "Your session is invalid or expired. Sign in again." }, 401);
    }
    const userId = authData.user.id;

    const admin = createClient(projectUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: customerSmsSetting, error: customerSmsSettingError } = await admin
      .from("customer_service_settings")
      .select("worker_sms_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (customerSmsSettingError) throw new Error("Could not verify this account's SMS permission.");
    if (customerSmsSetting?.worker_sms_enabled !== true) {
      return jsonResponse({ ok: false, error: "Worker SMS is disabled for this customer account. Contact the app owner if you need it enabled." }, 403);
    }

    const { data: worker, error: workerError } = await admin
      .from("Workers")
      .select("id, user_id, full_name, phone")
      .eq("id", workerId)
      .eq("user_id", userId)
      .maybeSingle();
    if (workerError) throw new Error("Could not verify worker ownership.");
    if (!worker) return jsonResponse({ ok: false, error: "Worker not found in this account." }, 404);

    const mobile = normalizeBangladeshMobile(String(worker.phone || ""));
    if (!mobile) return jsonResponse({ ok: false, error: "This worker does not have a valid Bangladesh mobile number." }, 400);

    let idempotencyKey = "";
    if (eventType === "salary_paid") {
      const { data: payroll, error } = await admin
        .from("WorkerPayroll")
        .select("id, worker_id, month_key, net_salary, status, paid_at")
        .eq("id", relatedId)
        .eq("worker_id", workerId)
        .eq("user_id", userId)
        .eq("status", "paid")
        .maybeSingle();
      if (error) throw new Error("Could not verify the salary payment.");
      if (!payroll) return jsonResponse({ ok: false, error: "The referenced salary payment is not marked Paid." }, 409);
      idempotencyKey = "salary_paid:" + payroll.id;
    } else if (eventType === "advance_paid") {
      const { data: advance, error } = await admin
        .from("WorkerAdvances")
        .select("id, worker_id, amount, deduct_from_month, request_date")
        .eq("id", relatedId)
        .eq("worker_id", workerId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error("Could not verify the salary advance.");
      if (!advance) return jsonResponse({ ok: false, error: "The referenced salary advance was not found." }, 409);
      idempotencyKey = "advance_paid:" + advance.id;
    } else {
      idempotencyKey = "custom:" + (customKey || crypto.randomUUID());
    }

    const smsMode = (Deno.env.get("DNOTIFY_SMS_MODE") || "non-masking").trim().toLowerCase();
    if (smsMode !== "non-masking" && smsMode !== "masking") {
      return jsonResponse({ ok: false, error: "DNOTIFY_SMS_MODE must be non-masking or masking." }, 500);
    }
    const senderId = Deno.env.get("DNOTIFY_SID")?.trim() || null;

    const logPayload = {
      user_id: userId,
      worker_id: workerId,
      event_type: eventType,
      related_id: relatedId,
      idempotency_key: idempotencyKey,
      mobile,
      message,
      sms_mode: smsMode,
      sender_id: senderId,
      status: "pending",
      error_message: null,
      provider_response: null,
      attempts: 1,
      created_at: new Date().toISOString(),
    };

    let logId: string;
    const { data: insertedLog, error: insertError } = await admin
      .from("WorkerSmsLogs")
      .insert(logPayload)
      .select("id")
      .single();

    if (insertError?.code === "23505") {
      const { data: existing, error: existingError } = await admin
        .from("WorkerSmsLogs")
        .select("id, status, attempts")
        .eq("user_id", userId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existingError) throw new Error("Could not check the previous SMS attempt.");
      if (!existing) throw new Error("The previous SMS request could not be found.");
      if (existing.status === "accepted") {
        return jsonResponse({ ok: true, duplicate: true, status: "accepted", log_id: existing.id, message: "This SMS was already accepted by DNotify." });
      }
      if (existing.status === "pending") {
        return jsonResponse({ ok: false, duplicate: true, status: "pending", log_id: existing.id, error: "This SMS request is already being processed." }, 409);
      }
      if (existing.status !== "failed") {
        return jsonResponse({ ok: false, duplicate: true, status: existing.status, log_id: existing.id, error: "This SMS request cannot be retried." }, 409);
      }
      const { data: claimed, error: claimError } = await admin
        .from("WorkerSmsLogs")
        .update({
          status: "pending",
          error_message: null,
          provider_response: null,
          attempts: Number(existing.attempts || 1) + 1,
          created_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("user_id", userId)
        .eq("status", "failed")
        .select("id")
        .maybeSingle();
      if (claimError) throw new Error("Could not claim the SMS retry.");
      if (!claimed) {
        return jsonResponse({ ok: false, duplicate: true, status: "pending", log_id: existing.id, error: "Another retry is already processing this SMS." }, 409);
      }
      logId = claimed.id;
    } else if (insertError) {
      throw new Error("Could not create the SMS history record.");
    } else {
      logId = insertedLog.id;
    }

    const endpoint = smsMode === "masking"
      ? "https://dnotify.net/api/v1/send-masking-sms"
      : "https://dnotify.net/api/v1/send-sms";
    const requestBody: Record<string, string> = { mobile, message };
    if (senderId) requestBody.sid = senderId;

    let providerResponse: Response;
    let providerData: Record<string, unknown>;
    try {
      providerResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + apiToken,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      const raw = await providerResponse.text();
      providerData = parseProviderBody(raw);
    } catch {
      await admin.from("WorkerSmsLogs").update({
        status: "failed",
        error_message: "Could not connect to DNotify.",
      }).eq("id", logId).eq("user_id", userId);
      return jsonResponse({ ok: false, status: "failed", log_id: logId, error: "Could not connect to DNotify. You can retry from SMS History." }, 502);
    }

    const providerStatus = String(providerData.status ?? "").toLowerCase();
    const explicitFailure =
      providerData.success === false ||
      providerData.status === false ||
      providerStatus === "error" ||
      providerStatus === "failed" ||
      Boolean(providerData.error);
    const accepted = providerResponse.ok && !explicitFailure;
    const errorMessage = accepted
      ? null
      : String(providerData.error || providerData.message || providerData.raw || ("DNotify returned HTTP " + providerResponse.status)).slice(0, 1000);

    const { error: updateError } = await admin
      .from("WorkerSmsLogs")
      .update({
        status: accepted ? "accepted" : "failed",
        provider_response: providerData,
        error_message: errorMessage,
        accepted_at: accepted ? new Date().toISOString() : null,
      })
      .eq("id", logId)
      .eq("user_id", userId);
    if (updateError) {
      return jsonResponse({ ok: accepted, status: accepted ? "accepted" : "failed", log_id: logId, warning: "The provider response was received but the SMS log could not be updated." }, accepted ? 200 : 502);
    }

    if (!accepted) {
      return jsonResponse({ ok: false, status: "failed", log_id: logId, error: errorMessage || "DNotify did not accept the SMS." }, 502);
    }
    return jsonResponse({ ok: true, status: "accepted", log_id: logId, message: "DNotify accepted the SMS request." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected SMS service error.";
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
