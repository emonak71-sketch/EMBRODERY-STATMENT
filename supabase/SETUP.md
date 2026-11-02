# Supabase setup required for Embroidery Statement v10

## 1. Six-digit password recovery email

The app uses Supabase Auth's password-recovery OTP flow.

1. Open the Supabase project connected to this app.
2. Go to **Authentication → Email Templates → Reset Password**.
3. Set the email subject to **Your Embroidery Statement password reset code**.
4. Replace the template body with [recovery-email.html](./templates/recovery-email.html).
5. Keep the Supabase variable `{{ .Token }}` in the template. Do not use `{{ .ConfirmationURL }}` when sending a six-digit code.
6. Under **Authentication → URL Configuration**, set the Site URL to `https://embroidery-statement-v10.vercel.app` and add that URL to Redirect URLs.
7. Configure a production SMTP provider under **Authentication → SMTP Settings**. The built-in sender is rate-limited and is not intended for production delivery.

The app verifies the code with Supabase Auth using `verifyOtp({ type: 'recovery' })`. A verified recovery session is required before the new password can be saved.

The current Vercel production URL is `https://embroidery-statement-v10.vercel.app`. Vercel SSO protection is intentionally enabled until the database migration and real email-delivery test are complete. Do not make the deployment public before the RLS migration has been applied and verified.

## 2. Account-level data isolation (mandatory before multi-user production)

The v10 app scopes customer and ledger reads/writes by `user_id` and expects Row Level Security (RLS) to be enabled.

1. Open **Supabase → SQL Editor**.
2. Open [v10-security-migration.sql](./v10-security-migration.sql).
3. Replace `YOUR_LOGIN_EMAIL` with the email address of the account that owns the existing customer and ledger data.
4. Run the script only if all legacy rows with a NULL `user_id` belong to that one account. If multiple accounts already have data in the same tables, stop and map each legacy row to its correct owner first.
5. Confirm that the existing customer and ledger records remain visible to the correct account.
6. Create a separate test account and confirm it cannot read or modify the first account's records.

The migration adds restrictive ownership guards as well as permissive owner policies. This prevents an older permissive policy from accidentally allowing cross-account access. It also enforces that a ledger transaction references a customer owned by the same account.

Do not publish the Supabase service-role key in the frontend or commit it to GitHub. The browser app should use only the public anon/publishable key; RLS protects the data.

## 3. Production verification checklist

- Request a password reset for a real account and confirm a six-digit code arrives in its email inbox.
- Verify a correct code, reject an incorrect/expired code, then set a new password.
- Confirm the old password no longer works and the new password does.
- Sign in with the owning account and verify that its existing parties and ledger entries are present.
- Sign in with a separate test account and verify it cannot read or modify the first account's records.
