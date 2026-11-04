# Embroidery Statement — Windows Desktop Releases

## One-time updater signing setup

1. Extract the supplied updater setup ZIP.
2. Double-click **Setup-Updater.bat**.
3. Sign in to the GitHub account that owns `emonak71-sketch/EMBRODERY-STATMENT` when the browser opens.
4. Create a strong Tauri key passphrase when prompted, then enter the same passphrase again when asked.
5. Keep the private key at `%USERPROFILE%\.tauri\embroidery-statement.key` and back it up with its passphrase in a secure password manager or encrypted backup.

The setup configures the public key as the GitHub Actions repository variable `EMBROIDERY_UPDATE_PUBLIC_KEY` and uploads the private key and passphrase as the Actions secrets `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. The private key is sent to GitHub through standard input; it is not printed or committed.

Do not regenerate or overwrite this key after publishing updates. Existing installed copies trust the public key that is embedded in their app. Losing the private key means future updates cannot be signed for those installations.

## Publishing future Windows updates

1. Ask the AI to make the requested app changes. The code changes should be reviewed and merged into `main`.
2. Bump the app version consistently in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`.
3. Open GitHub → Actions → **Windows Desktop Signed Release** → **Run workflow**.
4. Enter the matching tag, for example `v1.0.1`. The workflow builds the Windows NSIS installer, signs the Tauri updater artifact, generates `latest.json`, and publishes the GitHub Release.
5. Installed signed copies can check for the update in **Settings → Windows Desktop & Reminders → Check for Updates**.

The workflow runs automatically when a matching `vX.Y.Z` tag is pushed. It can also build automatically when an approved, version-bumped commit is pushed to the dedicated `release` branch; this is the AI-assisted release path.

## First signed installation

The existing unsigned verification installer does not contain the updater public key. It cannot update itself securely. Install the first signed release once manually; later releases can be installed through the in-app updater.

## Windows notifications

The app already has a **Test notification** control under **Settings → Windows Desktop & Reminders**. The Windows CI workflow also installs the NSIS app and runs a native notification-dispatch smoke test. CI can verify that Windows accepted the native notification request; only the user's own Windows desktop can confirm the visible banner and sound because Windows notification settings and Do Not Disturb are machine-specific.

## Signing terminology

The Tauri updater key signs update artifacts so the app can verify update authenticity. It is not a Microsoft Authenticode certificate and does not remove the Windows SmartScreen “Unknown Publisher” warning. Authenticode publisher signing is a separate certificate-based process.
