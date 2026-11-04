# Embroidery Statement for Windows — Desktop Architecture & Release Guide

This is a desktop enhancement of the **existing React/Vite/TypeScript + Supabase application**. The existing web/PWA build, Supabase accounts, customer records, ledgers, worker records, email OTP and animations are retained.

## Current implementation status

The desktop integration is developed in the `feature/tauri2-windows-desktop` branch. Production `main` is unchanged. The new SQL migration has been applied additively to the connected EMBRODERY-STATMENT Supabase project and its owner-scoped RLS policies were checked. The web build and pure attendance tests have passed in Windows CI; native compilation and end-to-end Windows 10/11 verification must be confirmed separately in the current GitHub Actions run.

**Do not publish v1.0.0 until the Windows build, signing, notification navigation, install/uninstall, update and clean-machine tests pass.** Do not publish incomplete features to production.

## Project layout

- `src-tauri`: Native Tauri 2 shell, Windows tray, autostart, updater, notification and single-instance plugins.
- `desktop/attendanceCore.ts`: Dhaka-time scheduling and session-completeness logic, independent of the UI.
- `desktop/DesktopHost.tsx`: Authenticated Supabase attendance verification on native scheduler ticks, after sleep and on startup.
- `components/NightAttendance.tsx`: Additive night attendance form; morning attendance remains in its existing daily form.
- `components/DesktopSettings.tsx`: Windows-only reminder / startup / updater settings, added to the original Settings.
- `supabase/worker-night-attendance-additive.sql`: Separate night table and idempotency claims (without changing the existing daily attendance rows).
- `.github/workflows/windows-desktop-ci.yml`: Windows compile and portable preview workflow.
- `.github/workflows/windows-desktop-release.yml`: Signed release and GitHub updater manifest workflow.

## Architecture and historical attendance semantics

`WorkerAttendance` is the legacy daily register. It remains the **morning** session, keeping all existing records unchanged. `WorkerNightAttendance` is a separate table with the same statuses. The two sessions use distinct unique (user, worker, date) keys. A worker's UI selection is never considered complete until it has been saved to Supabase.

A session is complete only if every active worker who has joined by that date has a persisted status of `present`, `absent`, `late`, `half_day` or `leave`. A session with no expected active workers does not generate a notification.

The native app emits regular scheduler ticks even when its window is hidden in the tray. The webview reads the authenticated, user-scoped Workers and attendance records from Supabase. Network failure means **retry later**, not “absence.” If the app starts after 11 AM or 11 PM, it reevaluates the currently due sessions. There is no notification when the PC is off or the app has been exited; Windows autostart recovers missed checks on next sign-in.

To avoid duplicate reminders across multiple devices, `WorkerReminderDeliveries` has a unique (user, date, morning/night) key. Claims are attempted only after an incomplete session is verified. The database is checked a second time after the claim, reducing the risk of a reminder racing with another device saving attendance. This claim protocol offers **at-most-once best effort**, not an exactly-once distributed delivery guarantee: if Windows suppresses notifications at the OS level, the app cannot guarantee visible delivery.

## Building on Windows

**Prerequisites:** Windows 10/11 x64, Node.js 22 LTS, Rust with MSVC toolchain, Visual Studio 2022 C++ Build Tools (MSVC v143 and Windows SDK), Microsoft Edge WebView2 Runtime.

```powershell
git clone https://github.com/emonak71-sketch/EMBRODERY-STATMENT.git
cd EMBRODERY-STATMENT
git checkout feature/tauri2-windows-desktop
npm ci
# Only if the Linux-generated lockfile omits the Windows Rollup native module:
npm install --no-save --no-package-lock @rollup/rollup-win32-x64-msvc@4.62.3
npm run build
npm run test:attendance
npm run desktop:icons
npm run desktop:dev
```

For production compilation (signed updater artifacts require configuration below):

```powershell
npm run desktop:build
```

The app uses a native window. Pressing X hides it to the Windows tray; use the tray menu's Exit Application command to terminate it. A second instance focuses the existing one.

For CI artifacts, open **GitHub → Actions → Windows Desktop - Tauri Build Check**, select the latest successful branch run and download `windows-portable-preview-unsigned`. Preview artifacts are **unsigned** and not production releases.

## Distribution formats

### Installed NSIS EXE

The GitHub Release workflow builds a per-user Windows NSIS setup executable with the app icon, Start Menu entry and standard uninstaller. The installer handles WebView2 according to Tauri's Windows installer configuration. It is the recommended edition for native Windows toasts, startup registration and signed one-click updates.

### Portable EXE

The CI/release workflow packages a raw `embroidery-statement.exe` plus a `.portable` marker and README. Place them together in a writable folder. The app stores its WebView2 user data in its adjacent `data/` directory where supported. Do not delete or replace `data/` when upgrading; replace only the EXE. Do not run multiple copies of the same portable folder simultaneously.

A raw EXE uses the already-installed Microsoft WebView2 runtime. Windows native toasts may require installed app identity; **portable notification and fully automatic portable update equivalence are not guaranteed**. On untrusted computers use the installer instead.

## Secure GitHub Releases & one-click updates

The repository does NOT contain signing private keys. A signed updater build requires:

1. On your Windows PC, run `powershell -ExecutionPolicy Bypass -File .\\scripts\\generate-tauri-signing-key.ps1`. The script generates a key pair under `%USERPROFILE%\\.tauri`; choose a strong passphrase and back up the private key + passphrase in a password manager or encrypted offline backup.
2. In **GitHub → Repository Settings → Secrets and variables → Actions**, add repository **variable** `EMBROIDERY_UPDATE_PUBLIC_KEY` (the complete contents of `embroidery-statement.key.pub`) and repository **secrets** `TAURI_SIGNING_PRIVATE_KEY` (complete contents of `embroidery-statement.key`) and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (the passphrase). The private key must never be pasted into chat, committed, or added as a repository variable.
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

Existing tables, row IDs, login credentials and the original 8-digit email OTP were not changed. Supabase client uses the existing public/anon key and authenticated user RLS; it must not use `service_role` in the Windows executable. User auth/profile data still follows Supabase's existing session persistence.

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
