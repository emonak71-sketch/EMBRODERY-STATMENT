export type AccountAccess = {
  has_access: boolean;
  access_source: string;
  access_until: string | null;
  trial_ends_at: string | null;
  manual_access_starts_at: string | null;
  manual_access_until: string | null;
  subscription_access_until: string | null;
};

export function accountPlan(access: AccountAccess | null, now = Date.now()) {
  const time = (value: string | null | undefined) => {
    const parsed = value ? new Date(value).getTime() : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  };
  if (!access) return null;
  if (access.access_source === 'owner_admin') return {tier:'owner', days:0, expires:null, starts:null, scheduled:false};
  const paidEnd = Math.max(time(access.manual_access_until), time(access.subscription_access_until));
  const pro = paidEnd > now;
  const end = pro ? Math.max(paidEnd, time(access.access_until)) : time(access.trial_ends_at);
  return {
    tier: pro ? 'pro' : access.has_access && end > now ? 'trial' : 'expired',
    days: Math.max(0, Math.ceil((end - now) / 86_400_000)),
    expires: end > 0 ? new Date(end).toISOString() : null,
    starts: access.manual_access_starts_at,
    scheduled: pro && time(access.manual_access_starts_at) > now && time(access.subscription_access_until) <= now,
  };
}
