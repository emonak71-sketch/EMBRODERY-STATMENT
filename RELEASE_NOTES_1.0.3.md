# Embroidery Statement v1.0.3

## Brand identity
- Apply the refreshed Embroidery Statement logo consistently across the app, sign-in screen, splash screen, sidebar and Windows app icon assets.
- Add the official About section with owner Em On, Facebook page and WhatsApp contact details.

## Sign-in experience
- Replace the previous login panel motion with a restrained liquid-glass design.
- Improve glass refraction, highlights, control contrast and reduced-motion handling.

## Windows desktop reliability
- Check signed app updates in the background while the app remains running in the system tray.
- Recheck releases every six hours without depending on attendance reminders being enabled.
- Continue checking attendance reminders through the native tray scheduler while the main window is hidden.
- Validate signed installer, updater manifest, direct asset URL, in-place upgrade and user-data preservation in Windows CI.

## Compatibility
- Preserve the existing application identifier, Tauri updater signing key, data directory and existing Supabase business records.
- Keep the v1.0.1 upgrade baseline in Windows CI to verify multi-version upgrade compatibility.
