import React from 'react';
import { AccountAccess, accountPlan } from '../desktop/subscriptionStatus';

export default function AccountPlanStatus({access, onViewPlans, compact=false}: {
  access: AccountAccess | null; onViewPlans?:()=>void; compact?:boolean;
}) {
  const plan = accountPlan(access);
  if (!plan || plan.tier === 'owner') return null;
  const date = (value: string) => new Intl.DateTimeFormat('en-GB', {dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
  if (compact) return plan.tier === 'pro' ? <span className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">Pro · {plan.days} days remaining</span> : null;
  return <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-900 dark:bg-sky-950/30">
    <h2 className="text-base font-black text-sky-900 dark:text-sky-100">{plan.tier === 'pro' ? 'Pro Version' : plan.tier === 'trial' ? '15-Day Free Trial' : 'Access Expired'}</h2>
    <p className="mt-2 text-sm font-bold text-sky-900 dark:text-sky-100">{plan.days} days remaining</p>
    {plan.expires && <p className="mt-2 text-xs text-sky-800 dark:text-sky-200">{plan.tier === 'trial' ? 'Trial ends' : 'Expires'}: {date(plan.expires)}</p>}
    {plan.scheduled && plan.starts && <p className="mt-2 text-xs text-sky-800 dark:text-sky-200">Your Pro period starts on {date(plan.starts)} after your remaining access. The countdown includes those remaining days.</p>}
    {plan.tier === 'trial' && <p className="mt-2 text-xs text-sky-800 dark:text-sky-200">Your data stays saved when the trial ends.</p>}
    {onViewPlans && <button type="button" onClick={onViewPlans} className="mt-4 rounded-xl bg-sky-700 px-4 py-2 text-xs font-black text-white">View Subscription Plans</button>}
  </section>;
}
