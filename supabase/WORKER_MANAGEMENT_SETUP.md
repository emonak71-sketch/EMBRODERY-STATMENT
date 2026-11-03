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

## Pre-migration data snapshot

The read-only check on 3 November 2026 recorded the following baseline in the live project:

| Table / storage | Rows |
|---|---:|
| Auth accounts | 2 |
| Parties | 7 |
| Transactions | 84 |
| Products, Expenses, Sales | 0 each |
| Workers, WorkerAttendance, WorkerPayroll | 0 each |
| Supabase Storage buckets / objects | 0 / 0 |

Ownership check: six Parties and all 84 Transactions belong to one existing account; one Party has a NULL `user_id`. No Transaction points to that ownerless Party, no Transaction has a missing Party, and no cross-account Party/Transaction mismatch was found. The second Auth account has no Party or Transaction rows in this snapshot.

These are a dated baseline, not target counts. Legitimate new business entries made after the snapshot should increase counts; do not delete or edit data to force a match. The verification script reports current counts and ownership checks.

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
6. Use **Salary Advances** to record an advance. Each worker has an **active salary cycle**: it starts in the current Bangladesh calendar month and stays open until that worker's payroll for the month is marked Paid. Therefore, November advances—including advances recorded in December before November salary is paid—remain assigned to November. After November payroll is marked Paid, that worker's active cycle automatically advances to December. All outstanding advances assigned to the active cycle are deducted together in full, once.
7. Use **Annual Report** to export salary/advance cash outflow by year.
8. Use **Payslips** to print or export a salary statement. Salary and advance events send through DNotify after the corresponding payment/advance record is saved. Custom SMS can be sent from the composer.

## Account and file safety

- Every new Worker record and document is scoped to the currently signed-in Supabase user.
- The private Storage bucket does not expose worker documents publicly.
- Worker document and salary history rows cannot be edited or deleted from the app.
- Paid payroll records are locked against accidental edits.
- Supabase Auth remains the source of truth for login. The same existing account can sign in on multiple devices; the email uniqueness rule remains enforced by Supabase Auth.
- Do not put a Supabase service-role key or database password in the frontend or commit either secret to GitHub.

## Important

Do not run any older SQL script that contains `DROP TABLE`, `TRUNCATE`, or broad `DELETE` statements. If a SQL error occurs, stop and share the exact error before retrying; do not improvise a partial schema change.

## DNotify SMS Backend Setup

The app calls the Supabase Edge Function `send-worker-sms`. The DNotify API token is never stored in the browser, app bundle, or GitHub.

### Required secret

In the existing Supabase project:

1. Open **Edge Functions → Secrets**.
2. Add the key `DNOTIFY_API_TOKEN`.
3. Paste the API token from DNotify into the Value field.
4. Save the secret. Do not paste it into ChatGPT, source code, GitHub, or a frontend environment variable.

### Optional configuration

- `DNOTIFY_SMS_MODE`: set to `non-masking` (default) or `masking`. Non-masking is the default and uses the sender ID configured in the DNotify account.
- `DNOTIFY_SID`: optional assigned Sender ID / masking name. Leave unset to use the DNotify account default.

### What sends SMS

- Salary: after a payroll row is successfully marked Paid, the app asks the Edge Function to send a salary message.
- Advance: after an advance record is saved, the app asks the Edge Function to send an advance message.
- Custom: the SMS composer lets the account owner edit and send a message to a selected worker.
- SMS History: lists gateway requests, status, attempt count and errors. Failed requests can be retried.
- Duplicate protection: salary and advance SMS use their payroll/advance IDs as idempotency references. If DNotify already accepted the request, a repeated action will not send it again.

### Status meaning

`accepted` means DNotify accepted the API request. It does not independently prove that the handset received the SMS. The app does not claim delivery confirmation unless a future DNotify delivery-status integration is added.

### Billing

DNotify deducts the applicable rate from the DNotify wallet when it accepts the message. Check wallet balance and per-SMS rates before enabling automatic salary/advance SMS.
