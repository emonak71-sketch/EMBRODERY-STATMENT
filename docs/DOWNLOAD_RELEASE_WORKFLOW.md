# Official Download Center — Release Checklist

This document describes the release contract used by `/download`. The public portal reads stable releases from the GitHub Releases API; it does not build installers.

## Public customer files

| Platform | Stable tag format | Required customer asset |
| --- | --- | --- |
| Windows | `vMAJOR.MINOR.PATCH` | A signed `.exe` whose filename does not contain `owner` or `uninstall` |
| Android | `android-vMAJOR.MINOR.PATCH` | `Embroidery-Statement-Android.apk` |
| iPhone / iPad / Mac | No binary release | The production Web App / PWA |

The portal ignores draft and prerelease releases. It selects the newest stable Windows release and newest stable Android release independently. The Recent stable releases section displays the six newest matching platform releases.

## Required release sequence

1. Make the requested product changes on a feature branch. Do not change customer data or signing identities as part of a website-only task.
2. Run the repository quality gate: typecheck, production builds, App Lock, motion, customer/owner separation, attendance and download portal tests.
3. Build the Windows Customer EXE with the existing Windows signing configuration. Build the Owner Control Center separately.
4. Build the Android Customer APK with the existing Android release keystore. Never regenerate or replace the keystore for a routine release.
5. Verify the generated installers, signatures, version numbers and updater manifests. Test upgrade compatibility before publishing.
6. Publish stable GitHub Releases using the tag formats and exact customer asset names above.
7. Confirm the assets are publicly downloadable and the release API returns them. Open `/download`, press Refresh and verify the new versions and file sizes.
8. Give the owner separate links for each deliverable that was actually built and published, including the Owner installer through a private channel when applicable.

## Security boundaries

- The public download portal must expose only customer-facing files.
- Never expose the Owner Control Center installer, signing keystores, keystore passwords, updater private keys, GitHub secrets or other credentials on the public portal.
- Keep Windows and Android signing identities stable so existing installations can accept future updates.
- Do not label an update as automatic installation. The portal automatically refreshes release metadata; Windows/Android installers still require the platform's normal update/install approval flow.
- If GitHub's public API is unavailable or rate-limited, show a recoverable error and link to the official Releases archive. Do not invent or hardcode a new version.

## Website update behaviour

A normal software release does not require a website code change or Vercel redeployment. The portal requests the stable release list on page load and on the Refresh action with browser caching disabled. A newly published release appears on the next successful fetch, provided the release tag and customer asset name match this contract.

A portal redesign or a change to release naming rules does require a code change, validation, merge and Production deployment.
