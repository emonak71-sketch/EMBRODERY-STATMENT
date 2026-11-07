# Embroidery Statement 1.0.12

- Account controls: read-only bill/payment/worker change history, oldest-bill-first receivable aging, and 30-day recovery for newly deleted business records.
- Restoring a permanently deleted customer also restores its archived ledger, with tenant checks and duplicate/expiry guards.
- Annual salary review schedule uses the last recorded increment (or joining date), supports a historical base date, and creates one reminder per review cycle from 15 days before the due date.
- Daily server job generates reminders at 09:00 Bangladesh time. The app syncs them on open/reconnect; closed-app mobile push is not included.
- No automatic salary amount change. Existing increment approval remains required.
- Removes the redundant Download Apps footer from sign-in in the new native builds.
- Existing Android keystore and Windows updater identities remain unchanged. This release does not remove operating-system scan or publisher-reputation warnings.
