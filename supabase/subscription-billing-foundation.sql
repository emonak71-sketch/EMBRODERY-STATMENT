-- Commercial SaaS billing foundation for Embroidery Statement.
-- Payment credentials and webhook writes remain server-side only.
begin;
create sequence if not exists public.billing_transaction_number_seq;
create sequence if not exists public.billing_invoice_number_seq;
create table if not exists public.subscription_plans (
  id text primary key, name text not null,
  billing_interval text not null check (billing_interval in ('month','year')),
  duration_days integer not null check (duration_days between 1 and 366),
  price_bdt numeric(12,2) not null check (price_bdt >= 0),
  max_workers integer, description text not null default '',
  features jsonb not null default '[]'::jsonb, is_active boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (max_workers is null or max_workers > 0)
);
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  plan_id text not null references public.subscription_plans(id) on delete restrict,
  status text not null check (status in ('trialing','active','past_due','expired','cancelled')),
  provider text, provider_customer_ref text, provider_subscription_ref text,
  started_at timestamptz not null default now(),
  current_period_start timestamptz not null, current_period_end timestamptz not null,
  trial_ends_at timestamptz, cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_period_end > current_period_start)
);
create unique index if not exists subscriptions_one_current_per_user_uidx
  on public.subscriptions(user_id) where status in ('trialing','active','past_due');
create unique index if not exists subscriptions_provider_ref_uidx
  on public.subscriptions(provider,provider_subscription_ref)
  where provider is not null and provider_subscription_ref is not null;
create index if not exists subscriptions_user_history_idx on public.subscriptions(user_id,created_at desc);
create table if not exists public.billing_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_no text not null unique default ('ES-TXN-' || to_char((now() at time zone 'Asia/Dhaka')::date,'YYYY') || '-' || lpad(nextval('public.billing_transaction_number_seq')::text,8,'0')),
  user_id uuid not null references auth.users(id) on delete restrict,
  subscription_id uuid references public.subscriptions(id) on delete restrict,
  plan_id text not null references public.subscription_plans(id) on delete restrict,
  provider text not null, provider_transaction_id text, payment_method text,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'BDT' check (currency='BDT'),
  status text not null check (status in ('initiated','pending','paid','failed','cancelled','refunded')),
  description text not null default '', period_start timestamptz, period_end timestamptz,
  gateway_response jsonb not null default '{}'::jsonb, failure_reason text,
  created_at timestamptz not null default now(), paid_at timestamptz,
  updated_at timestamptz not null default now()
);
create unique index if not exists billing_transactions_provider_ref_uidx
  on public.billing_transactions(provider,provider_transaction_id) where provider_transaction_id is not null;
create index if not exists billing_transactions_user_history_idx on public.billing_transactions(user_id,created_at desc);
create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique default ('ES-INV-' || to_char((now() at time zone 'Asia/Dhaka')::date,'YYYY') || '-' || lpad(nextval('public.billing_invoice_number_seq')::text,8,'0')),
  transaction_id uuid not null unique references public.billing_transactions(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  seller_snapshot jsonb not null default '{}'::jsonb, buyer_snapshot jsonb not null default '{}'::jsonb,
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  tax numeric(12,2) not null default 0 check (tax >= 0),
  total numeric(12,2) not null check (total >= 0),
  currency text not null default 'BDT' check (currency='BDT'),
  issued_at timestamptz not null default now(), invoice_image_path text,
  created_at timestamptz not null default now()
);
create index if not exists billing_invoices_user_history_idx on public.billing_invoices(user_id,issued_at desc);
create index if not exists subscriptions_plan_id_idx on public.subscriptions(plan_id);
create index if not exists billing_transactions_plan_id_idx on public.billing_transactions(plan_id);
create index if not exists billing_transactions_subscription_id_idx on public.billing_transactions(subscription_id);
create index if not exists billing_webhook_events_transaction_id_idx on public.billing_webhook_events(transaction_id);
create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(), provider text not null,
  provider_event_id text not null, transaction_id uuid references public.billing_transactions(id) on delete restrict,
  event_type text not null, payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(), processed_at timestamptz, processing_error text,
  unique(provider,provider_event_id)
);
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_transactions enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.billing_webhook_events enable row level security;
drop policy if exists "active plans are readable" on public.subscription_plans;
create policy "active plans are readable" on public.subscription_plans for select to anon,authenticated using (is_active=true);
drop policy if exists "users read own subscriptions" on public.subscriptions;
create policy "users read own subscriptions" on public.subscriptions for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "users read own billing transactions" on public.billing_transactions;
create policy "users read own billing transactions" on public.billing_transactions for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "users read own billing invoices" on public.billing_invoices;
create policy "users read own billing invoices" on public.billing_invoices for select to authenticated using ((select auth.uid())=user_id);
revoke insert,update,delete on public.subscription_plans,public.subscriptions,public.billing_transactions,public.billing_invoices,public.billing_webhook_events from anon,authenticated;
grant select on public.subscription_plans to anon,authenticated;
grant select on public.subscriptions,public.billing_transactions,public.billing_invoices to authenticated;
commit;