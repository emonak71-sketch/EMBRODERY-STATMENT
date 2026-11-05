# Embroidery Statement multi-platform rollout

## Applications

- Customer web/PWA: the default Vite entry at `/`, using the shared Supabase project.
- Owner web/PWA: `/owner.html`, with its own `owner-manifest.json`. The Owner portal is login-only and verifies the signed-in account against `public.billing_admins`.
- Customer Windows desktop: the existing Tauri application.
- Owner Windows desktop: the same Tauri native host with `src-tauri/tauri.owner.conf.json`, a separate product name, application identifier and updater manifest.
- Customer Android: the Tauri Android target built as APK/AAB from the same customer web entry.

## Shared backend

The Owner portal and all customer clients use the same Supabase Auth and database. Subscription access is enforced by database functions/RLS, not by hiding frontend pages. Owner-granted access, payment date, BDT amount, payment method and transaction reference are stored in the private access ledger.

Support tickets and messages are shared across customer and owner clients. New reports notify the owner; owner replies notify the customer. The `support-assistant` Edge Function uses Gemini when configured and escalates to the team when the model is unavailable or requests human help.

## Update channels

- Web/PWA: the service worker checks for updates at page load and every 30 minutes, activates the new worker and reloads the app shell. Sensitive customer data and API responses are not cached.
- Windows Customer EXE: signed Tauri updates use `latest-customer.json`. `latest.json` is also published as a compatibility alias for previously installed releases.
- Windows Owner EXE: signed Tauri updates use the independent `latest-owner.json` channel.
- Android: the Android workflow builds APK and AAB artifacts. Once the signed AAB is uploaded to Google Play, Play Store-managed automatic updates deliver later versions. The first Play Console upload is a manual publishing step.

## Credentials required to finish production automation

1. Supabase Edge Function secret `GEMINI_API_KEY` (optional `GEMINI_MODEL`, default `gemini-2.5-flash`) enables live AI answers. Without it, the assistant saves the report and escalates to the Owner inbox.
2. GitHub Actions variable `EMBROIDERY_UPDATE_PUBLIC_KEY` and secrets `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` are required for signed Windows updater releases. Never commit the private key.
3. Android release signing requires an upload keystore and its passwords/alias. Google Play publishing additionally requires a Play Console developer account and service-account credentials.
4. Notifications currently synchronize in-app and dispatch native/browser notifications while the client is active. Background push delivery while the app is closed requires VAPID credentials for Web Push and Firebase Cloud Messaging credentials for Android.

## Validation

The CI workflows build the customer and owner web bundles, type-check the TypeScript application, build and smoke-test both Windows installers, and build the Android APK/AAB. Supabase QA uses rollback-only synthetic accounts and does not leave test customers, support tickets or access grants in production data.
