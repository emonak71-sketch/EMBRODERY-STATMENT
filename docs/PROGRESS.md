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
