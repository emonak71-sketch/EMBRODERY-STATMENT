# Embroidery Statement v1.0.9

- Bundle Tailwind styles with Customer and Owner apps so startup does not wait for an external CDN.
- Remove external script and font dependencies from startup HTML.
- Display an initial loading screen and a recoverable screen for React startup failures.
- Register the PWA service worker only in web sessions, not native desktop apps.
- Verify both Windows apps start the React UI using a fresh WebView profile without manual refresh.
- Preserve Owner Settings, manual update controls, existing updater signatures and application data.
