alter table public."WorkerSmsLogs"
  drop constraint if exists "WorkerSmsLogs_event_type_check";

alter table public."WorkerSmsLogs"
  add constraint "WorkerSmsLogs_event_type_check"
  check (event_type = any (array['salary_paid'::text, 'advance_paid'::text, 'custom'::text, 'worker_completed'::text]));
