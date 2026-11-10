# Embroidery Statement 1.0.20

## Customer application
- Added a signed-update popup when the Windows app starts or is reopened from the system tray.
- The popup shows the new version and the release notes before installation.
- Added Update Now, Later, and close controls. Dismissing the popup only hides it for the current open session; it appears again the next time the app is opened until the update is installed.
- Removed silent background installation. Updates now require the user to choose Update Now.

## Owner Control Center
- Added the same dismissible update popup and release-note display to the Owner Windows app.
- Fixed the Owner updater channel to read the latest signed Owner manifest from GitHub Releases.
- Added tray-reopen update checks for the Owner app.

## Shared
- Signed Customer and Owner update manifests now include the full release notes shown in the popup.
- Update checks remain signature-verified and preserve the existing installed app data.
