# Embroidery Statement — existing Supabase Auth setup

This is an enhancement to the existing React/Vite application and its existing Supabase project. Keep the current project URL, publishable/anon key, users, customer records, ledgers, worker records and attendance history. Do not create a replacement Supabase project.

## Required eight-digit email OTP configuration

The application accepts **exactly eight digits** for both new-account verification and password recovery. It intentionally rejects six-, seven- and nine-digit values.

1. In the existing Supabase project, open **Authentication → Providers → Email** and make sure email signups are enabled and **Confirm email** is ON. Hosted Supabase normally enables email confirmation by default; verify the actual setting.
2. Set the email OTP length to **8 digits** in the project's Auth settings. The code and email templates below expect eight digits; do not leave the provider at its six-digit default.
3. Open **Authentication → Email Templates → Confirm signup**. Set the subject to **Your Embroidery Statement verification code** and use the complete contents of [confirmation-email.html](./templates/confirmation-email.html). Keep `{{ .Token }}` in the template.
4. Open **Authentication → Email Templates → Reset Password**. Set the subject to **Your Embroidery Statement password reset code** and use [recovery-email.html](./templates/recovery-email.html). Keep `{{ .Token }}` in the template; the app verifies it with `verifyOtp({ type: 'recovery' })`.
5. Configure a production SMTP provider under **Authentication → SMTP Settings** so verification and recovery messages reliably reach Gmail inboxes. Supabase's default mail service is rate-limited and is not suitable for broad commercial distribution.
6. Apply [enable-signup-email-otp.sql](./enable-signup-email-otp.sql) to the existing project's SQL Editor if it has not already been applied. It removes only the legacy `BEFORE INSERT` auto-confirm trigger. It does not delete, recreate, or unconfirm existing accounts.
7. Test with an email account you control: create a new account, verify the eight-digit signup code, request a password reset, verify its eight-digit recovery code, set a new password, and sign in.

**Important:** The source code now refuses to silently complete signup if Supabase returns an authenticated session before email verification. If Auth is configured for auto-confirm, the UI explains that Confirm email and eight-digit OTP must be enabled. This prevents the app from claiming that OTP verification occurred when it did not.

## Data protection

- The OTP setup SQL changes only the new-signup confirmation trigger and function permissions.
- Existing user accounts and existing business records are preserved.
- The desktop attendance additions use separate night-attendance and reminder-delivery tables; the legacy morning attendance records remain in place.
- The desktop hardening SQL is additive: it tightens owner-scoped RLS policies, grants only the required reminder RPC permissions, and adds indexes. It does not delete business or attendance rows.
- Do not run unrelated legacy/V10 multi-account migrations unless a verified backup exists and every legacy row's owner is known.

## Verification

Use a dedicated test account. Do not insert test attendance or dummy customer rows into a real user's workspace. Verify that the confirmation email and recovery email each contain exactly eight digits and that an invalid or expired code is rejected.

## Deployment

This branch updates the existing application; it is not a replacement app. Keep the current web/PWA deployment and Supabase project. Merge or sync the source changes through the existing deployment workflow after the source checks pass.
