import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "Sign in is required." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Support service is not configured." }, 503);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: "Your session is invalid. Please sign in again." }, 401);

  let input: { ticket_id?: string; message?: string };
  try { input = await req.json(); } catch { return json({ error: "Invalid request body." }, 400); }
  const ticketId = String(input.ticket_id || "");
  const message = String(input.message || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(ticketId) || message.length < 1 || message.length > 6000) {
    return json({ error: "A valid support ticket and message (1–6000 characters) are required." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: ticket, error: ticketError } = await admin
    .from("support_tickets")
    .select("id,user_id,subject,category,status")
    .eq("id", ticketId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (ticketError || !ticket) return json({ error: "Support request not found." }, 404);

  const { error: messageError } = await admin.from("support_messages").insert({
    ticket_id: ticketId,
    sender_id: user.id,
    sender_role: "customer",
    body: message,
  });
  if (messageError) return json({ error: "Your message could not be saved. Please try again." }, 500);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
  let reply = "";
  let needsHuman = false;
  let modelUsed: string | null = null;

  if (apiKey) {
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(apiKey),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{
                text: "You are the official Embroidery Statement product-support assistant. Reply in the customer's language: Bangla, English or Banglish. Help with the embroidery business ledger, customers/parties, transactions, worker attendance, payroll, reports, account login, 8-digit email OTP, subscriptions and app updates. Be concise and step-by-step. Never claim to have inspected their account, database, payment or device. Never request passwords, OTPs, Nagad PINs or secret keys. Do not invent features or promise a fix. If the issue requires account access, payment verification, data repair, a bug fix, or you are uncertain, set needs_human=true and say the support team has been notified. Return JSON only with fields reply (string) and needs_human (boolean)."
              }]
            },
            contents: [{
              role: "user",
              parts: [{
                text: "Ticket subject: " + ticket.subject + "\nCategory: " + ticket.category + "\nCustomer message: " + message
              }]
            }],
            generationConfig: { temperature: 0.25, responseMimeType: "application/json" },
          }),
        },
      );
      if (!response.ok) throw new Error("AI provider returned " + response.status);
      const result = await response.json();
      const raw = result?.candidates?.[0]?.content?.parts?.map((part: {text?:string}) => part.text || "").join("") || "";
      const parsed = JSON.parse(raw);
      reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
      needsHuman = Boolean(parsed.needs_human);
      modelUsed = model;
      if (!reply) throw new Error("AI response was empty");
    } catch (error) {
      console.error("Support AI failed; escalating to owner:", error);
      needsHuman = true;
    }
  } else {
    needsHuman = true;
  }

  if (!reply) {
    reply = "আপনার সমস্যাটি বুঝেছি। এই মুহূর্তে আমি নিশ্চিত সমাধান দিতে পারছি না। আপনার রিপোর্টটি আমাদের Support Team-এর কাছে পাঠানো হয়েছে। Team বিষয়টি পর্যালোচনা করে আপনার সঙ্গে যোগাযোগ করবে।";
  }

  const { error: assistantError } = await admin.from("support_messages").insert({
    ticket_id: ticketId,
    sender_id: null,
    sender_role: "assistant",
    body: reply,
    ai_model: modelUsed,
  });
  if (assistantError) console.error("Could not save assistant response:", assistantError);

  if (needsHuman) {
    await admin.from("support_tickets").update({ status: "in_progress", priority: "high" }).eq("id", ticketId);
    const { data: owners } = await admin.from("billing_admins").select("user_id");
    if (owners?.length) {
      await admin.from("app_notifications").insert(owners.map((owner: {user_id:string}) => ({
        user_id: owner.user_id,
        notification_type: "support_ticket",
        title: "Customer issue needs your team",
        body: (user.email || "A customer") + " needs human support: " + ticket.subject,
        payload: { ticket_id: ticketId, customer_id: user.id },
      })));
    }
  }

  return json({ ok: true, reply, escalated: needsHuman, model: modelUsed });
});
