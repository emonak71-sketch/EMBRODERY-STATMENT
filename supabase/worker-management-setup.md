# Worker Management Setup — redirect

Use [WORKER_MANAGEMENT_SETUP.md](./WORKER_MANAGEMENT_SETUP.md) as the single step-by-step setup guide.

Important corrections:
- The current production project has already applied `worker-management-additive.sql` and `worker-management-fk-indexes-20261103.sql`.
- The available Parties/Transactions CSV exports are row-data copies, not a complete restorable database backup.
- `worker-management-additive.sql` does **not** modify Supabase Auth or remove the auto-confirm trigger.
- If six-digit signup OTP is required, first enable **Authentication → Providers → Email → Confirm email**, then run `enable-signup-email-otp.sql`. That script removes only the legacy BEFORE INSERT trigger and leaves all existing accounts unchanged.
- Password-reset email-template instructions remain in `IN_PLACE_UPDATE.md`.
- After the Worker migration, run `worker-management-verify.sql` to check row counts, RLS, private Storage, and the signup trigger state.

Do not run older destructive schema-reset scripts. Always confirm a restorable backup before applying SQL to the live project.
