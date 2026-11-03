# Password Recovery Account Check Setup

This feature checks whether an email belongs to an existing Auth account before requesting a Supabase recovery OTP. The lookup is protected by Cloudflare Turnstile and server-side rate limits.

## Required configuration

### 1. Create a Cloudflare Turnstile widget

1. Open the Cloudflare dashboard and go to **Turnstile**.
2. Add a widget for the hostname `embroidery-statement-v10.vercel.app`.
3. Choose the **Managed** widget mode.
4. Copy the **Site Key** and **Secret Key**.

Do not put the Secret Key in frontend code or send it in chat.

### 2. Add the public Site Key to Vercel

In **Vercel → EMBROIDERY-STATEMENT project → Settings → Environment Variables**, add:

- Name: `VITE_TURNSTILE_SITE_KEY`
- Value: the Cloudflare Turnstile Site Key
- Environment: Production (and Preview if preview deployments should use the widget)

Redeploy the Production deployment after saving the variable.

### 3. Add the private Secret Key to Supabase

In **Supabase → Project → Edge Functions → Secrets**, add:

- Name: `TURNSTILE_SECRET_KEY`
- Value: the Cloudflare Turnstile Secret Key

This value must remain server-side.

## Protection details

- The Edge Function requires a valid Turnstile response before checking Auth accounts.
- The rate limiter allows up to 3 checks per email hash and 10 checks per IP hash per rolling hour.
- Only HMAC hashes are stored in `public.password_recovery_rate_limits`; raw email addresses and IP addresses are not stored there.
- The table has RLS enabled and no table access for `anon` or `authenticated`.
- The browser receives only an existence boolean and a status code; no user ID or profile fields are returned.
- After a positive check, the browser calls Supabase Auth's normal `resetPasswordForEmail` endpoint. Supabase's own Auth rate limits still apply.

## Expected UI messages

When Bangla is selected, an unknown address displays a Bangla account-not-found message. When English is selected, it displays the equivalent English message.
