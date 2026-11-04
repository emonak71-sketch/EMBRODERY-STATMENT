# Embroidery Statement v1.0.2

## Security and account access
- Add a separate App Lock password shared by the Web App and Windows desktop app for the same account.
- Require App Lock after a fresh app launch; do not prompt again merely because the user switches browser tabs.
- Allow App Lock password changes from Settings and recovery through the account email's exact eight-digit recovery OTP.
- Store only a salted PBKDF2 password hash on the server; limit repeated incorrect attempts.
- Detect App Lock changes made on another device and require the new password.

## Existing application features
- Retain the 1.0.1 online-only workspace guard and account-scoped Activity History.
- Preserve Worker Attendance, Payroll, Advance, and existing business records.

## Windows desktop
- Keep the existing Tauri updater signing key, application identifier, and update endpoint.
- Publish a signed 1.0.2 NSIS installer and updater manifest compatible with the 1.0.1 installation.
- Validate the 1.0.1-to-1.0.2 in-place upgrade, per-user data preservation, installer startup, and native notification dispatch in Windows CI.
