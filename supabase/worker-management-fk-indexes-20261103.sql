-- Add covering indexes for the Worker tables' composite foreign keys.
-- Safe and additive: no rows are changed or deleted.
begin;

create index if not exists worker_advance_recoveries_worker_idx
  on public."WorkerAdvanceRecoveries"(user_id, worker_id);

create index if not exists worker_sms_logs_worker_idx
  on public."WorkerSmsLogs"(user_id, worker_id);

commit;
