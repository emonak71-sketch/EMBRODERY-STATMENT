# Android Customer App — Direct APK Distribution

Embroidery Statement's Android customer app is distributed directly as an APK. Google Play Store and Android App Bundle (AAB) publishing are intentionally not used.

## Build

1. Install Node.js 22, Java 17, Android SDK/NDK and the Rust Android target.
2. Run `npm ci`.
3. Initialize the native Android project once with `npx @tauri-apps/cli@2 android init`.
4. Configure the Android release keystore in `src-tauri/gen/android/keystore.properties` and the release signing configuration in `src-tauri/gen/android/app/build.gradle.kts`.
5. Build only the direct-install package:

```bash
npx @tauri-apps/cli@2 android build --apk --target aarch64
```

The signed ARM64 APK is published as a separate GitHub release tagged `android-vX.Y.Z` and can be shared through the product website or a direct download link. A separate build is required if older 32-bit devices must be supported. Do not distribute an unsigned APK as a customer release.

## Android signing and update compatibility

Android requires every production APK to be signed. Every later APK update must be signed with the same private keystore as the version already installed on a customer's phone. Losing or replacing that keystore prevents in-place updates; customers would have to uninstall and reinstall, which can remove local app data.

Keep the keystore outside Git and store its base64 content, alias and password as protected GitHub Actions secrets:

- `ANDROID_KEY_BASE64`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `ANDROID_STORE_PASSWORD`

The in-app updater checks the Android-only GitHub release channel, opens the APK download in the Android system browser and offers the new APK. Android will still require the user to approve installation of a sideloaded update. PWA updates are delivered by the service worker and do not require an APK reinstall.

## CI

The Android CI workflow builds a debug APK for QA. The separate Android release workflow builds and publishes a signed production APK plus `latest-android.json`; it runs only when the matching `android-vX.Y.Z` tag is pushed or manually dispatched. Production releases require the persistent keystore above.
