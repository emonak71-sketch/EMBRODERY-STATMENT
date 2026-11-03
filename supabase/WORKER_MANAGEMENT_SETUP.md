# Worker Management: Safe Setup

This change is designed for the existing Embroidery Statement Supabase project. It does not create a new app or replace existing business tables.

## Before touching the live database

1. Open the existing Supabase project: `utyhcyjdvzezvagrmbxg`.
2. In Supabase Dashboard, open **Database → Backups** and confirm a recent backup is available. If your plan does not provide a restorable backup, export the database before proceeding. Keep the backup outside this repository.
3. Confirm the existing two Auth accounts can still sign in. Do not delete, recreate, or merge users.
4. The current project check found no Supabase Storage buckets or Storage objects. Existing relational data remains in the existing tables; this migration does not move or delete it.

## Enable the requested email OTP for new signups

The live database has a legacy `auto_confirm_user_trigger` on `auth.users`. It automatically marks every new signup as confirmed, which bypasses the six-digit signup OTP in the app.

1. Open **Authentication → Providers → Email** and enable **Confirm email**.
2. In **SQL Editor → New query**, run the complete contents of `supabase/enable-signup-email-otp.sql`.
3. This removes only the auto-confirm trigger. It does not update, delete, recreate, or unconfirm any existing account. The old trigger function is intentionally left in place but is no longer called.
4. For the password-reset email template, follow `supabase/IN_PLACE_UPDATE.md`; the Worker migration does not change password recovery.

## Apply the Worker SQL

1. In the same existing Supabase project, open **SQL Editor → New query**.
2. Open `supabase/worker-management-additive.sql` in this repository.
3. Copy the complete SQL file into the SQL Editor.
4. Review that the query is being run against the existing project, not a newly created project.
5. Click **Run** once and wait for the query to finish.
6. Open `supabase/worker-management-verify.sql` and run it. Confirm the Worker tables exist, RLS is enabled, the bucket is private, and the auto-confirm trigger query returns zero rows.

The migration is additive:
- Creates `WorkerDocuments`, `WorkerSalaryIncrements`, `WorkerAdvances`, and `WorkerAdvanceRecoveries`.
- Adds new optional payroll columns to the existing `WorkerPayroll` table.
- Adds an automatic Worker ID sequence and safe salary/advance processing triggers.
- Signup OTP is handled separately by `enable-signup-email-otp.sql`; the Worker migration itself does not change Auth.
- Creates a private Storage bucket for new worker documents.
- Adds account-scoped RLS policies.

It does **not** drop, truncate, rename, delete, or rewrite existing account, Party, Transaction, Product, Expense, Sales, Worker, Attendance, or Payroll rows.

## Deploy the app

Deploy the application changes only after the SQL has completed successfully. The app code is in the feature branch `feature/worker-management-safe-20261103`; merge it to the production branch only after the preview build and database setup have been checked.

## How to use the new Worker tools

1. Open **Workers → More HR Tools**.
2. Select a worker.
3. Upload a photo, NID front/back, birth certificate, passport, driving licence, or other PDF/image. New uploads are saved as new versions; existing uploads are not overwritten.
4. Use **Company ID Card** to print or export a worker ID card.
5. Use **Salary Increments** to record a dated increment. The current salary and unpaid draft payrolls from the effective salary month onward update atomically; paid payroll is never changed.
6. Use **Salary Advances** to record an advance and choose the salary month for recovery. When the first eligible payroll at or after that month is marked Paid, the outstanding advance is deducted automatically and recorded once.
7. Use **Annual Report** to export salary/advance cash outflow by year.
8. Use **Payslips** to print or export a salary statement. A payment SMS can be prepared only after payroll is marked Paid; the phone's SMS app still requires the user to press Send.

## Account and file safety

- Every new Worker record and document is scoped to the currently signed-in Supabase user.
- The private Storage bucket does not expose worker documents publicly.
- Worker document and salary history rows cannot be edited or deleted from the app.
- Paid payroll records are locked against accidental edits.
- Supabase Auth remains the source of truth for login. The same existing account can sign in on multiple devices; the email uniqueness rule remains enforced by Supabase Auth.
- Do not put a Supabase service-role key or database password in the frontend or commit either secret to GitHub.

## Important

Do not run any older SQL script that contains `DROP TABLE`, `TRUNCATE`, or broad `DELETE` statements. If a SQL error occurs, stop and share the exact error before retrying; do not improvise a partial schema change.
