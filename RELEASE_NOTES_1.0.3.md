# Embroidery Statement v1.0.3

## Brand identity
- Apply the refreshed Embroidery Statement logo consistently across the app, sign-in screen, splash screen, sidebar and Windows app icon assets.
- Add the official About section with owner Em On, Facebook page and WhatsApp contact details.

## Sign-in experience
- Replace the previous login panel motion with a restrained liquid-glass design.
- Improve glass refraction, highlights, control contrast and reduced-motion handling.
- Stabilize HD statement image exports with a consistent 960px layout, font-safe capture and automatic PNG fallback.

## Windows desktop reliability
- Check signed app updates in the background while the app remains running in the system tray.
- Recheck releases every six hours without depending on attendance reminders being enabled.
- Continue checking attendance reminders through the native tray scheduler while the main window is hidden.
- Validate signed installer, updater manifest, direct asset URL, in-place upgrade and user-data preservation in Windows CI.

## Compatibility
- Preserve the existing application identifier, Tauri updater signing key, data directory and existing Supabase business records.
- Keep the v1.0.1 upgrade baseline in Windows CI to verify multi-version upgrade compatibility.
## Owner Control Center and customer support
- Add a separate Owner Control Center for Web/PWA and Windows, with owner-only authentication isolated from customer sessions.
- Search registered customers by verified email, review trial/Pro status and payment history, and grant a manually verified Nagad subscription for a selected duration.
- Add a customer support inbox with AI-assisted troubleshooting, human escalation, owner replies and synchronized in-app notifications.
- Preserve one customer account and shared Supabase data across Customer Web/PWA, Windows and Android clients.
- Publish separate signed Windows update channels for the Customer application and Owner Control Center.
