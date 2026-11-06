# Download system rollout

## Safety baseline — 2026-11-06
- Rollback tag: `backup-before-download-system-20261106` at commit `f5f1dcc0cdc1f58157ef4c4e72cae9036dde513d`.
- Working branch: `feat/download-system-android-owner-20261106`.
- No production customer records or existing Windows signing keys were changed.

## Public download portal — COMPLETE
- PR #41 merged to `main` as commit `b93321b198b80f588f124cec3a5f031c8f5d25d6`.
- Device recommendations: Android → APK; Windows → Customer EXE; iPhone/iPad → Web App/PWA; Mac and other devices → Web App.
- All three download/install cards remain visible; the matching device is highlighted.
- iPhone/iPad Safari instructions and browser-supported PWA install action are included.
- `/download` and `/download.html` routes are configured; service-worker offline navigation recognizes both.
- The portal reads the public GitHub Releases API without cache on page load. New eligible releases are reflected on the next page load/refresh; no website redeployment is needed just to change release links.

## Release verification — COMPLETE
- Windows `v1.0.11`: Customer and Owner installers, signatures and updater manifests are published. The public customer portal selects the Customer EXE, not the Owner installer.
- Android signing backup was confirmed by the owner before release.
- Android `android-v1.0.11`: signed `Embroidery-Statement-Android.apk` and `latest-android.json` published successfully.
- Android release workflow run `42232678770` completed successfully.

## CI and Production deployment — VERIFIED
- GitHub PR #41 checks passed; main quality-gate run `42231669916` passed all jobs.
- Vercel production deployment `dpl_Bp6Z8WDUx6HwBZaCGg7JfmYqgg38` is `READY` for the merged main commit.
- Production domain attached to the connected project: `https://embroidery-statement.vercel.app`.
- Vercel build logs confirm `dist/download.html` and the download JavaScript/CSS bundles were built and deployment completed.
- Automated checks cover Windows, Android, iPhone, iPad, desktop-mode iPad, Mac, Linux and both download routes.
- A physical-device tap-through was not performed in this run because the connected browser context was unavailable; do not report it as tested.

## Separate follow-up — NOT PART OF THE PUBLIC DOWNLOAD PORTAL
- An Owner-only release uploader/private-storage workflow remains a separate unfinished feature. It is not required for customers to download the currently published Customer EXE or Android APK.
- Preserve existing Windows signing keys and updater endpoints when implementing that separate feature.


## Premium public Download Center — 2026-11-06
- PR #42 merged to `main` as `9c08ada6aed7febf4a7b2ded4afded9dc8e8bd2e`.
- Rebuilt the public `/download` page as a responsive, branded software download center with hero section, platform cards, device recommendation, feature overview, installation steps, FAQ and release history.
- Shows current customer EXE/APK version, file size, publication date, and SHA-256 digest when GitHub supplies one.
- Adds canonical URL, SEO description, Open Graph and Apple touch icon metadata.
- Adds `npm run test:downloads` and wires it into the repository quality gate. Device detection and both download routes pass.
- Adds `docs/DOWNLOAD_RELEASE_WORKFLOW.md` with the required stable release tag and customer asset naming contract.
- Customer-only EXE and Android APK are the only public binary downloads; Owner Control Center remains separate and private.
- Vercel Production deployment `dpl_HAkAfFAs65AMu78wq2DtLSZgUNLt` is `READY` for the merged main commit. `https://embroidery-statement.vercel.app/download` returned HTTP 200 and the built HTML references the new download bundle.
- Production build completed, dependency audit found 0 vulnerabilities, download portal tests passed, and customer/Owner web bundle checks passed.
- The full repository Windows installer smoke-test and Android debug APK compile jobs were still running at the last status check; they are QA checks, not newly published customer releases.
- For routine software releases, publish the correct stable GitHub release and expected asset filename; the portal detects it on next page load/Refresh without a portal code change or Vercel redeployment.
