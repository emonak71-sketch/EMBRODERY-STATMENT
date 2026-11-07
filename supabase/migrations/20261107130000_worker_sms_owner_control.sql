create table if not exists public.platform_feature_settings (
  id smallint primary key check (id = 1),
  worker_sms_enabled boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.platform_feature_settings (id, worker_sms_enabled)
values (1, true)
on conflict (id) do nothing;

alter table public.platform_feature_settings enable row level security;
drop policy if exists "Authenticated users can read platform feature settings" on public.platform_feature_settings;
create policy "Authenticated users can read platform feature settings"
  on public.platform_feature_settings for select to authenticated using (true);

revoke all on table public.platform_feature_settings from anon, authenticated;
grant select on table public.platform_feature_settings to authenticated;

create or replace function public.get_worker_sms_enabled()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.worker_sms_enabled from public.platform_feature_settings s where s.id = 1),
    false
  );
$$;

revoke all on function public.get_worker_sms_enabled() from public;
grant execute on function public.get_worker_sms_enabled() to authenticated;

create or replace function public.owner_set_worker_sms_enabled(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_billing_admin() then
    raise exception using errcode = '42501', message = 'Owner access required.';
  end if;
  if p_enabled is null then
    raise exception using errcode = '22023', message = 'Choose whether worker SMS is enabled.';
  end if;
  update public.platform_feature_settings
  set worker_sms_enabled = p_enabled,
      updated_by = auth.uid(),
      updated_at = now()
  where id = 1;
  if not found then
    raise exception using errcode = 'P0002', message = 'Platform feature settings are not initialized.';
  end if;
  return p_enabled;
end;
$$;

revoke all on function public.owner_set_worker_sms_enabled(boolean) from public;
grant execute on function public.owner_set_worker_sms_enabled(boolean) to authenticated;
