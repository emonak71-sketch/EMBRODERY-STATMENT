# Download system rollout

## Safety baseline — 2026-11-06
- Backup tag: `backup-before-download-system-20261106`, main commit `f5f1dcc0cdc1f58157ef4c4e72cae9036dde513d`.
- Working branch: `feat/download-system-android-owner-20261106`.
- No production customer records changed. Existing Windows signing keys must remain unchanged.

## Completed
- Verified repository admin access and browser GitHub login.
- Inspected current DownloadPortal, Vercel routing, package version and Android release workflow.
- Verified Windows v1.0.11 already contains Customer/Owner EXEs, signatures and updater manifests.

## Next
1. Extend existing download portal with device recommendations, PWA installation and correct routes; run required checks.
2. Inspect and fix Android CI; create persistent keystore outside repo, deliver backup and WAIT for owner confirmation before release.
3. Implement owner-only uploader through existing auth, preserving Windows updater signatures.
4. Verify live deployment, releases, downloads and login.

## Access limits / errors
- GitHub connector supports code/branches/PRs, not tag creation, secrets or workflow dispatch; authenticated browser is available for those.
- Shell direct GitHub connection is unavailable; use connector for repository reads/writes.
- Existing local workspace has historical changes; work in isolated directory verified byte-for-byte against current main tracked files.

## Part A implementation
- Added Windows/Android/Apple/other-device recommendations while keeping all cards visible even when release lookup fails.
- Added browser-provided PWA install action and iPhone/iPad/Mac instructions; added manifest link.
- Added explicit /download and /download.html rewrites before SPA fallback, plus offline-route handling.
- Local typecheck, production build, App Lock, motion, owner/customer contacts, attendance and seven-device/routing checks PASS. Customer/Owner isolated builds checked separately.
- PR CI and live verification pending; main unchanged.

## Android signing checkpoint — WAITING FOR OWNER BACKUP
- Repository secret names inspected: Windows signing secrets exist; all four ANDROID_* signing secrets are absent. Do not regenerate Windows keys.
- Existing main Android debug compile CI passed (quality-gate run 42216033787); release signing is not configured.
- Generated first Android RSA-4096 JKS outside repository, alias `embroidery-android-release`, valid through 2054-03-24.
- Certificate SHA-256: `0B:B6:A0:8C:07:33:6F:71:94:64:EB:8D:AD:B5:23:C6:00:A1:D6:A7:91:57:F7:7E:1F:45:8E:E7:2C:BD:CA:1F`.
- Backup ZIP delivered privately to owner; passwords provided once in chat, never committed. Local key folder `/workspace/scratch/01852556d84c/EmbroideryStatement-Keys` is transient, not the owner's Windows PC.
- Durable private backup: Library file `libfile_1f46085ee7888191b0f8b984b634e5d8`, `Embroidery_Statement_Android_Keystore_Backup.zip`. ZIP contains JKS, public certificate and README, no passwords.
- STOP until owner confirms downloading/extracting key to their own computer and saving passwords plus an offline copy.
- Next: confirm final PR #41 checks before merge and verify live /download; install four Android signing secrets from same key, add release version/certificate validation and docs/ANDROID_RELEASE.md, then build android-v1.0.11. Owner uploader remains pending until backup confirmation.
- Part A PR #41: local required checks pass; GitHub Validate existing app and Shared App Lock checks passed; full platform CI was still running at checkpoint. Main has not changed.
