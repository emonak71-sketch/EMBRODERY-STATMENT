# Existing Embroidery Statement app — safe update notes

This update keeps the existing Supabase project and the existing customer/ledger tables. It does not run SQL migrations, delete rows, recreate tables, or replace the app with a new project.

## Enable six-digit password recovery

The app now uses Supabase Auth's recovery OTP flow:

1. Open the **existing** Supabase project used by this app.
2. Go to **Authentication → Email Templates → Reset Password**.
3. Set the subject to: **Your Embroidery Statement password reset code**.
4. Replace the email body with the contents of [recovery-email.html](./templates/recovery-email.html).
5. Keep the template variable `{{ .Token }}`. The app verifies it using `verifyOtp({ type: 'recovery' })`.
6. Configure a production SMTP provider in **Authentication → SMTP Settings** so messages reliably reach Gmail inboxes.
7. Test with an account you control: request a code, verify the six digits, set a new password, then sign in with the new password.

## Data protection

- No table or row deletion is part of this source update.
- Existing `Parties` and `Transactions` queries and CRUD behavior are intentionally preserved.
- No `user_id` migration or RLS policy is applied by this update.
- Do not run the separate V10 multi-account migration unless a verified backup exists and every legacy row's owner is known.

## Deployment

The original app is referenced in the repository README as the Google AI Studio app. This branch is a source-code update for that existing project; it is not a replacement app. Merge or sync it only through the existing app's established workflow.
