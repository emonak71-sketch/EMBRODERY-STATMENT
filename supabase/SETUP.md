# Supabase setup required for Embroidery Statement v10

## 1. Six-digit password recovery email

The app uses Supabase Auth's password-recovery OTP flow:

1. Open the Supabase project connected to this app.
2. Go to **Authentication → Email Templates → Reset Password**.
3. Replace the template body with the contents of [recovery-email.html](./templates/recovery-email.html).
4. Save the template. It must contain the Supabase variable `{{ .Token }}`; do not replace it with `{{ .ConfirmationURL }}` if you want the six-digit code.
5. Under **Authentication → URL Configuration**, set the Site URL to the production app URL and add the production URL (and local development URL, if used) to Redirect URLs.
6. Configure a production SMTP provider under **Authentication → SMTP Settings**. The built-in email sender is rate-limited and is not intended for production delivery.

The app verifies the code with Supabase Auth using `verifyOtp({ type: 'recovery' })`. A verified recovery session is required before the new password can be saved.

## 2. Account-level data isolation (important)

The v10 app explicitly scopes customer and ledger reads/writes by `user_id` and expects Row Level Security (RLS) to be enabled.

Before deploying v10 to production:

1. Open **Supabase → SQL Editor**.
2. Open [v10-security-migration.sql](./v10-security-migration.sql).
3. Replace `YOUR_LOGIN_EMAIL` with the email address of the account that owns the existing customer and ledger data.
4. Run the script only if all existing rows with a NULL `user_id` belong to that single account. If more than one account already has data in the same tables, stop and map each legacy row to its correct owner first.
5. Confirm that RLS is enabled on `Parties` and `Transactions`, and that existing records remain visible to the correct account.

Do not publish the Supabase service-role key in the frontend or commit it to GitHub. The browser app should use only the public anon/publishable key; RLS protects the data.

## 3. Production verification checklist

- Request a password reset for a real account and confirm a six-digit code arrives in its email inbox.
- Verify a correct code, reject an incorrect/expired code, then set a new password.
- Confirm the old password no longer works and the new password does.
- Sign in with the owning account and verify that its existing parties and ledger entries are present.
- Sign in with a separate test account and verify it cannot read or modify the first account's records.
