# Embroidery Statement v1.0.4

## Owner Control Center
- Add a separate Owner Control Center for the web, PWA and Windows desktop.
- Allow authorized owners to search customer accounts, review access history and grant Pro access for a selected number of days.
- Keep Owner and Customer authentication sessions isolated on the same browser/device.

## Customer support and notifications
- Add customer support tickets with a shared Owner inbox and real-time conversation updates.
- Add a product-aware AI support assistant for Bangla, Banglish and English, with human escalation when a safe answer is unavailable.
- Notify owners about new support tickets and customer replies.
- Notify customers when manual Pro access is activated, including the granted duration and expiry date.

## Cross-platform delivery
- Add a dedicated Owner PWA entry and a separate Owner Windows installer.
- Add the customer Android ARM64 application with an in-app update check and Android installation confirmation.
- Improve PWA service-worker update checks and offline routing for the Customer and Owner entry points.
- Keep independent signed Windows updater manifests for Customer and Owner applications.

## Security and reliability
- Restrict support-table privileges and enforce row-level access for customer and owner records.
- Normalize support ticket/message timestamps and preserve the existing business database.
- Keep the existing customer application identifier, Windows data directory and updater signing configuration.
