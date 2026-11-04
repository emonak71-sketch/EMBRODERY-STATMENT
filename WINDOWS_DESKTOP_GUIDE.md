# Embroidery Statement for Windows — Desktop Architecture & Release Guide

This is a desktop enhancement of the **existing React/Vite/TypeScript + Supabase application**. The existing web/PWA build, Supabase accounts, customer records, ledgers, worker records, email OTP and animations are retained.

## Current implementation status

The desktop integration is developed in the `feature/tauri2-windows-desktop` branch. Production `main` remains unchanged. The connected EMBRODERY-STATMENT Supabase project has the night-attendance, reminder-lease, signup-OTP and desktop security/performance migrations recorded. The legacy auto-confirm trigger on `auth.users` is removed; the unused trigger function has a fixed search path and no anon/authenticated execute permission. Owner-scoped policies now target authenticated users and use `(select auth.uid())`; missing foreign-key indexes have been added. The reminder RPCs were tested under the authenticated database role inside a rollback-only transaction, including a successful pending-to-sent completion; the test row was rolled back. The latest pre-change Windows CI run successfully compiled Tauri and smoke-tested unsigned installer/portable previews. **The CI workflow has now been changed so it no longer builds or uploads any EXE/installer**: it checks TypeScript, the web/PWA build, attendance logic, Rust formatting and native Windows Rust compilation only. Real Windows 10/11 install, notification, sleep/resume and account-flow tests remain for the owner's PC.

**Do not publish v1.0.0 until the Windows build, signing, notification navigation, install/uninstall, update and clean-machine tests pass.** Do not publish incomplete features to production.

## Project layout

- `src-tauri`: Native Tauri 2 shell, Windows tray, autostart, updater, notification and single-instance plugins.
- `desktop/attendanceCore.ts`: Dhaka-time scheduling and session-completeness logic, independent of the UI.
- `desktop/DesktopHost.tsx`: Authenticated Supabase attendance verification on native scheduler ticks, after sleep and on startup.
- `components/NightAttendance.tsx`: Additive night attendance form; morning attendance remains in its existing daily form.
- `components/DesktopSettings.tsx`: Windows-only reminder / startup / updater settings, added to the original Settings.
- `supabase/worker-night-attendance-additive.sql`: Separate night table and idempotency claims (without changing the existing daily attendance rows).
- `supabase/desktop-security-performance-hardening.sql`: owner-scoped RLS, reminder RPC permissions and missing FK indexes.
- `supabase/enable-signup-email-otp.sql`: removes the legacy auto-confirm trigger without changing existing accounts.
- `.github/workflows/windows-desktop-ci.yml`: source checks and native Rust compilation only; it deliberately does not create EXE or installer artifacts.
- `.github/workflows/windows-desktop-release.yml`: Signed release and GitHub updater manifest workflow.

## Architecture and historical attendance semantics

`WorkerAttendance` is the legacy daily register. It remains the **morning** session, keeping all existing records unchanged. `WorkerNightAttendance` is a separate table with the same statuses. The two sessions use distinct unique (user, worker, date) keys. A worker's UI selection is never considered complete until it has been saved to Supabase.

A session is complete only if every active worker who has joined by that date has a persisted status of `present`, `absent`, `late`, `half_day` or `leave`. A session with no expected active workers does not generate a notification.

The native app emits regular scheduler ticks even when its window is hidden in the tray. The webview reads the authenticated, user-scoped Workers and attendance records from Supabase. Network failure means **retry later**, not “absence.” If the app starts after a checkpoint, it reevaluates the currently due sessions and can recover missed checkpoints from the previous 24 hours. It intentionally ignores older checkpoints to avoid stale alerts. There is no notification when the PC is off or the app has been exited; Windows autostart recovers recent missed checks on next sign-in.

To avoid duplicate reminders across multiple devices, `WorkerReminderDeliveries` has a unique (user, date, morning/night) key. Claims are attempted only after an incomplete session is verified. The database is checked a second time after the claim, reducing the risk of a reminder racing with another device saving attendance. Claims have a three-minute lease: a crash before delivery leaves a pending claim that can be reclaimed after expiry; successful notifications are marked sent. This protocol offers **at-most-once best effort**, not an exactly-once distributed delivery guarantee: if Windows suppresses notifications at the OS level, the app cannot guarantee visible delivery.

## Database migration order

For the connected existing project, the Supabase migration history already records the following desktop migrations as applied:

1. `add_separate_night_attendance_and_reminder_delivery`
2. `worker_reminder_claim_leases_and_delivery_state`
3. `enable_signup_email_otp`
4. `desktop_security_performance_hardening`

Do not re-run these migrations on the connected project. They are additive: the legacy morning `WorkerAttendance` rows remain untouched; night records use `WorkerNightAttendance`; reminder claims use `WorkerReminderDeliveries`. The OTP migration removes only the auto-confirm trigger for future signups. The hardening migration tightens owner-scoped RLS and adds indexes without deleting business data.

## Building on Windows

**Prerequisites:** Windows 10/11 x64, Node.js 22 LTS, Rust with MSVC toolchain, Visual Studio 2022 C++ Build Tools (MSVC v143 and Windows SDK), Microsoft Edge WebView2 Runtime.

```powershell
git clone https://github.com/emonak71-sketch/EMBRODERY-STATMENT.git
cd EMBRODERY-STATMENT
git checkout feature/tauri2-windows-desktop
npm ci
npm run typecheck
npm run build
npm run test:attendance
npm run desktop:icons
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --manifest-path src-tauri/Cargo.toml
npm run desktop:dev
```

When you are ready to create the Windows installer/EXE on your PC, run:

```powershell
npm run desktop:build
```

This is the final packaging step you will perform yourself. The source-check CI intentionally does **not** create or upload an EXE or installer.

The app uses a native window. Pressing X hides it to the Windows tray; use the tray menu's Exit Application command to terminate it. A second instance focuses the existing one. After your local build, run `./scripts/windows-installer-smoke.ps1` from the repository root to test install, shortcuts, autostart, close-to-tray, single-instance, uninstall cleanup and preservation of user app data.

## Windows installer smoke test

The installer smoke-test script is retained for you to run **after your local EXE build**. It silently installs the setup executable, checks the uninstall registry entry and Desktop/Start Menu shortcuts, launches the app, checks first-run Windows autostart registration in HKCU or HKLM, sends a window-close message to verify the process remains in the tray, launches a second instance to verify single-instance behaviour, then terminates and uninstalls the test installation. It verifies shortcut/autostart cleanup and confirms the uninstaller does not delete the app's user-data directory. The source-check CI does not run this installer test because it deliberately does not build an EXE.

## Version management

Use the repository helper to keep the frontend, lockfile, Tauri manifest and Tauri config versions aligned:

```powershell
npm run version:bump -- patch
# or: npm run version:bump -- minor
# or: npm run version:bump -- 1.2.3
```

The signed-release validation also checks that `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json` all match the `vX.Y.Z` tag. Review changes and run the source checks before creating a release tag.

## Distribution formats

### Installed NSIS EXE

The GitHub Release workflow builds a per-user Windows NSIS setup executable with the app icon, Start Menu entry and standard uninstaller. A custom NSIS uninstaller hook removes the app's Windows Run registry entry on uninstall, preventing stale startup entries. The installer handles WebView2 according to Tauri's Windows installer configuration. It is the recommended edition for native Windows toasts, startup registration and signed one-click updates.

### Portable EXE

The CI/release workflow packages `embroidery-statement.exe`, a `.portable` marker, README and Microsoft's small Evergreen WebView2 bootstrapper. Place them together in a writable folder. If WebView2 Runtime is missing, run `MicrosoftEdgeWebView2Setup.exe` (internet required) before launching the app. The app stores its WebView2 user data in its adjacent `data/` directory where supported. Do not delete or replace `data/` when upgrading; replace only the EXE. Do not run multiple copies of the same portable folder simultaneously.

A raw EXE uses the installed Microsoft WebView2 runtime; the included bootstrapper can install it when missing (internet required). Windows native toasts may require installed app identity; **portable notification and fully automatic portable update equivalence are not guaranteed**. On untrusted computers use the installer instead.

## Secure GitHub Releases & one-click updates

The repository does NOT contain signing private keys. A signed updater build requires:

1. On your Windows PC, run `powershell -ExecutionPolicy Bypass -File .\\scripts\\generate-tauri-signing-key.ps1`. The script generates a key pair under `%USERPROFILE%\\.tauri`; choose a strong passphrase and back up the private key + passphrase in a password manager or encrypted offline backup.
2. Install GitHub CLI on that PC and run `gh auth login` with a GitHub account that has repository administration/write-secret permission.
3. Run `powershell -ExecutionPolicy Bypass -File .\\scripts\\configure-github-updater-secrets.ps1`. It sets the public key as a repository Actions variable and sends the private key/passphrase directly to GitHub as Actions secrets through standard input. It does not print either secret. If you prefer, add them manually under **GitHub → Repository Settings → Secrets and variables → Actions**. The private key must never be pasted into chat, committed, or added as a repository variable.
4. Review and merge this branch only after CI and installed-app testing pass.
5. Keep versions aligned in `package.json`, `package-lock.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`.
6. Push a tag exactly matching that version (e.g. `v1.0.0` for the initial signed desktop release), with descriptive GitHub Release notes. Workflow `windows-desktop-release.yml` runs on the tag.
7. Inspect the GitHub Release. Verify the NSIS installer, its updater signature and `latest.json` exist. Install v1.0.0 then test upgrading it to a separately signed v1.0.1 release **before** distributing broadly.

When an installed app finds a version greater than its current version, Settings offers **Update Now** and **Remind Me Later**. The updater verifies the release signature with the embedded public key. Do not expose the signing private key in a frontend build, CI log or public repository.

**Important:** Tauri updater signing is different from Windows Authenticode signing. Windows SmartScreen can warn on unsigned executables; obtain an appropriate code-signing certificate for commercial distribution.

## Reminder Settings

The Settings page on Windows exposes:
- Enable attendance reminders (default enabled).
- Morning 11:00 and night 23:00, interpreted in **Asia/Dhaka**.
- Start with Windows (installed edition; enabled on first installed startup).
- Start minimized to tray.
- Current app language, auto-detected from existing `app_language` preference.
- Test native notification; app version; check and install signed releases.

The English/Bangla notification wording is defined in `desktop/attendanceCore.ts` and matches the product requirements exactly. Switch language in the original Sidebar; desktop reminders follow the latest app selection.

## Windows Authenticode signing (separate from updater signing)

The Tauri updater key above signs update packages and manifests. It does **not** apply a Windows Authenticode signature to the installer executable. Authenticode signing is optional for functional testing but recommended for commercial distribution and SmartScreen reputation. It requires a valid code-signing certificate from a trusted certificate authority (normally supplied as a PFX plus its password). No certificate has been supplied or installed, so the current preview EXEs are unsigned. Do not use a self-signed certificate for public distribution or promise that it removes SmartScreen warnings.

## Security

The connected Supabase project now has the legacy auto-confirm trigger removed, so new signups can follow the email-confirmation flow. Existing users and data are unchanged. The app rejects a signup response that already contains a session before OTP verification. Before testing new accounts, verify in Supabase Auth that **Confirm email** is enabled, the email OTP length is **8**, and the Confirm Signup and Reset Password templates use `{{ .Token }}` (the supplied HTML templates are in `supabase/templates/`). Configure production SMTP for reliable Gmail delivery. The connected project's leaked-password protection is still disabled; enable it under Supabase Authentication → Password Security. The desktop app uses only the existing public/anon key and authenticated user RLS; never put `service_role` in the Windows executable.

Production database read/write tests should use a dedicated **test account**. Do not insert fake attendance records for real users during QA.

## Limitations and Windows QA still required

- Tauri's Rust core and Windows native plugin compilation must be verified on GitHub Actions; a green JavaScript build alone is **not** a successful desktop build.
- Test Windows 10 and Windows 11 separately, including clean installation/uninstallation, expired login, sleep/resume, 11 AM/11 PM reminders and saved night records.
- A background tray application cannot deliver a notification while Windows is shut down, or after explicit Exit.
- Native Windows toast interactions depend on the notification plugin version, Windows permission state and notification lifetime; direct click-to-open must be validated on a real installed application.
- Portable mode is not an equivalent auto-update or native-toast experience.
- Autostart applies after Windows **user sign-in**, not before login or at BIOS boot.
- The public GitHub Releases updater endpoint requires public releases. If this repository becomes private, an authenticated update-distribution channel will be required.
- A GitHub Actions successful build artifact isn't proof that production sign-in, real-time Supabase, WebView2 portable profile or app-level notification click flows work.

## Test checklist

- [ ] CI `npm run build` passes
- [ ] CI `npm run test:attendance` passes
- [ ] Tauri Windows MSVC compilation passes
- [ ] Installed NSIS launches without browser
- [ ] Desktop shortcut, Start Menu, uninstaller work
- [ ] Old login, signup, 8-digit OTP, recovery work
- [ ] Supabase clients, transactions, payroll and ledger unaffected
- [ ] Morning saved records suppress reminders
- [ ] Night saved records suppress reminders
- [ ] Partial/missing worker statuses trigger reminders
- [ ] Both session reminders at configured Dhaka times
- [ ] Database outage causes retry, no false notification
- [ ] Bangla/English from last app language selection
- [ ] Close to tray, tray menu and complete Exit work
- [ ] Windows sign-in autostart creates one instance
- [ ] Sleep/resume and powered-off checkpoint recovery work
- [ ] Installed toast click opens the correct attendance session
- [ ] Signed 1.0.0→1.0.1 update succeeds
- [ ] Update does not erase data or preferences
- [ ] Portable EXE starts, keeps data folder and runs on a second clean PC with WebView2 installed
- [ ] Windows 10 and Windows 11 validation
