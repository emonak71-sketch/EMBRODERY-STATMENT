import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, RefreshCw, ShieldCheck, Copy, CheckCircle2, Clock3, XCircle, Wallet, LockKeyhole } from 'lucide-react';
import { dbService } from '../services/supabaseService';

type Plan = { id:string; name:string; billing_interval:'month'|'year'; duration_days:number; price_bdt:number; max_workers:number|null; description:string; features:unknown };
type Subscription = { id:string; status:string; current_period_start:string; current_period_end:string; cancel_at_period_end:boolean; subscription_plans?:Plan };
type BillingTransaction = { id:string; transaction_no:string; plan_id:string; amount:number; currency:string; status:string; provider:string; payment_method?:string|null; created_at:string; paid_at?:string|null; subscription_plans?:{name:string;billing_interval:string}|null };
type TrialStatus = {trial_started_at:string;trial_ends_at:string;is_trial_active:boolean;is_trial_expired:boolean}|null;
type PaymentSettings = { provider:string; account_type:string; receiver_number:string|null; instructions:string; is_active:boolean }|null;
type PaymentSubmission = { id:string; plan_id:string; amount:number; sender_number:string; receiver_number:string; nagad_transaction_id:string; status:'pending'|'approved'|'rejected'; reviewer_note?:string|null; created_at:string; reviewed_at?:string|null; subscription_plans?:{name:string;billing_interval:string}|null };
const money=(n:number)=>new Intl.NumberFormat('en-BD',{style:'currency',currency:'BDT',maximumFractionDigits:2}).format(Number(n)||0);
const dateLabel=(value?:string|null)=>value?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'—';
const safeText=(value:unknown,fallback='—')=>typeof value==='string'&&value.trim()?value:fallback;
const normaliseBdNumber=(value:string)=>value.replace(/[^0-9]/g,'').replace(/^880/,'0');

const SubscriptionBilling:React.FC<{onAccessRefresh?:()=>void|Promise<void>}>=({onAccessRefresh})=>{
 const [plans,setPlans]=useState<Plan[]>([]);
 const [subscription,setSubscription]=useState<Subscription|null>(null);
 const [transactions,setTransactions]=useState<BillingTransaction[]>([]);
 const [trialStatus,setTrialStatus]=useState<TrialStatus>(null);
 const [submissions,setSubmissions]=useState<PaymentSubmission[]>([]);
 const [pendingSubmissions,setPendingSubmissions]=useState<PaymentSubmission[]>([]);
 const [paymentSettings,setPaymentSettings]=useState<PaymentSettings>(null);
 const [isAdmin,setIsAdmin]=useState(false);
 const [selectedPlanId,setSelectedPlanId]=useState('');
 const [senderNumber,setSenderNumber]=useState('');
 const [nagadTransactionId,setNagadTransactionId]=useState('');
 const [receiverDraft,setReceiverDraft]=useState('');
 const [submitting,setSubmitting]=useState(false);
 const [savingReceiver,setSavingReceiver]=useState(false);
 const [reviewingId,setReviewingId]=useState('');
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');

 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{
   const [p,s,t,settings,mine,admin,trial]=await Promise.all([
    dbService.getSubscriptionPlans(),dbService.getMySubscription(),dbService.getMyBillingTransactions(),
    dbService.getNagadPaymentSettings(),dbService.getMyNagadPaymentSubmissions(),
    dbService.isBillingAdmin(),dbService.getMyTrialStatus()
   ]);
   setPlans(p as Plan[]);setSubscription(s as Subscription|null);setTransactions(t as BillingTransaction[]);
   setTrialStatus(trial as TrialStatus);setPaymentSettings(settings as PaymentSettings);
   setSubmissions(mine as PaymentSubmission[]);setIsAdmin(Boolean(admin));
   setReceiverDraft((settings as PaymentSettings)?.receiver_number||'');
   if(admin){const pending=await dbService.getPendingNagadPaymentSubmissions();setPendingSubmissions(pending as PaymentSubmission[]);}
   else setPendingSubmissions([]);
   setSelectedPlanId(current=>current||(p as Plan[])[0]?.id||'');
   await onAccessRefresh?.();
  }catch(e:any){setError(e.message||'Could not load subscription and billing history.');}
  finally{setLoading(false);}
 },[onAccessRefresh]);
 useEffect(()=>{void load();},[load]);

 const selectedPlan=plans.find(p=>p.id===selectedPlanId)||null;
 const subscriptionExpired=Boolean(subscription&&new Date(subscription.current_period_end).getTime()<=Date.now());
 const displayedSubscriptionStatus=subscriptionExpired?'expired':subscription?.status||'inactive';
 const trialDaysRemaining=trialStatus?.is_trial_active?Math.max(0,Math.ceil((new Date(trialStatus.trial_ends_at).getTime()-Date.now())/86_400_000)):0;

 const submitPayment=async(e:React.FormEvent)=>{
  e.preventDefault();if(!selectedPlan||submitting)return;
  const sender=normaliseBdNumber(senderNumber);
  if(!/^01[3-9][0-9]{8}$/.test(sender)){setError('সঠিক ১১ সংখ্যার Nagad sender number লিখুন।');return;}
  if(nagadTransactionId.trim().length<6){setError('Nagad Transaction ID সঠিকভাবে লিখুন।');return;}
  setSubmitting(true);setError('');setNotice('');
  try{
   await dbService.submitNagadPersonalPayment(selectedPlan.id,sender,nagadTransactionId.trim());
   setSenderNumber('');setNagadTransactionId('');
   setNotice('Payment submission জমা হয়েছে। Nagad transaction যাচাই হওয়ার পর Subscription চালু হবে।');
   await load();
  }catch(e:any){setError(e.message||'Payment submission জমা দেওয়া যায়নি.');}
  finally{setSubmitting(false);}
 };

 const saveReceiver=async(e:React.FormEvent)=>{
  e.preventDefault();if(savingReceiver)return;
  setSavingReceiver(true);setError('');setNotice('');
  try{
   const saved=await dbService.setNagadPersonalReceiver(receiverDraft);
   setReceiverDraft(saved);setNotice('Nagad Personal receiver number সংরক্ষণ হয়েছে। এখন গ্রাহক পেমেন্ট জমা দিতে পারবেন।');
   await load();
  }catch(e:any){setError(e.message||'Nagad number সংরক্ষণ করা যায়নি.');}
  finally{setSavingReceiver(false);}
 };

 const reviewPayment=async(id:string,approve:boolean)=>{
  if(reviewingId)return;
  const prompt=approve
   ?'Nagad app-এর transaction history-তে টাকা এবং Transaction ID মিলিয়ে দেখেছেন? যাচাই করা থাকলে Approve করুন।'
   :'এই payment submission Reject করতে চান?';
  if(!window.confirm(prompt))return;
  setReviewingId(id);setError('');setNotice('');
  try{
   await dbService.reviewNagadPersonalPayment(id,approve,approve?'Verified in Nagad transaction history':'Payment could not be verified');
   setNotice(approve?'Payment verified. Subscription activated.':'Payment submission rejected.');
   await load();
  }catch(e:any){setError(e.message||'Payment review failed.');}
  finally{setReviewingId('');}
 };

 const copyReceiver=async()=>{
  if(!paymentSettings?.receiver_number)return;
  try{await navigator.clipboard.writeText(paymentSettings.receiver_number);setNotice('Nagad number copied.');}
  catch{setNotice('Nagad number: '+paymentSettings.receiver_number);}
 };

 return <div className="mx-auto max-w-7xl space-y-6 pb-10">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
   <div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-sky-700"><CreditCard size={13}/> Account Billing</div><h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">Subscription & Billing</h1><p className="mt-1 text-sm text-slate-500">Choose a plan, pay manually through Nagad and review your verified payment history.</p></div>
   <button onClick={()=>void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><RefreshCw size={14} className={loading?'animate-spin':''}/>Refresh</button>
  </div>
  {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
  {notice&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
  {loading?<div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading billing records…</div>:<>
   <div className="grid gap-4 lg:grid-cols-2">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
     <div className="flex items-center gap-2 text-sm font-black"><ShieldCheck size={17} className="text-emerald-600"/>Current Subscription</div>
     {subscription ? <div className="mt-4 space-y-2"><div className="text-xl font-black">{subscription.subscription_plans?.name||subscription.id}</div><div className="text-sm text-slate-500">Status: <span className={'font-bold capitalize '+(subscriptionExpired?'text-rose-600':'text-emerald-700')}>{displayedSubscriptionStatus}</span></div><div className="text-xs text-slate-500">Current period: {dateLabel(subscription.current_period_start)} – {dateLabel(subscription.current_period_end)}</div><div className="text-xs text-slate-500">Renewal: Manual — no automatic charge.</div>{subscriptionExpired&&<p className="text-xs font-bold text-rose-600">Your access is paused. Renew a plan below to restore access.</p>}</div> : trialStatus?.is_trial_active ? <div className="mt-4 space-y-2"><div className="text-xl font-black text-emerald-700">15-Day Free Trial</div><div className="text-sm font-bold text-emerald-700">Trial active · {trialDaysRemaining} {trialDaysRemaining===1?'day':'days'} remaining</div><div className="text-xs text-slate-500">Started: {dateLabel(trialStatus.trial_started_at)}</div><div className="text-xs text-slate-500">Trial ends: {dateLabel(trialStatus.trial_ends_at)}</div><p className="text-xs text-slate-500">Subscribe before the trial ends to keep using all features without interruption.</p></div> : trialStatus?.is_trial_expired ? <div className="mt-4 space-y-2"><div className="text-xl font-black text-rose-600">Free Trial Expired</div><div className="text-sm text-slate-500">Your 15-day trial ended on {dateLabel(trialStatus.trial_ends_at)}.</div><p className="text-xs font-bold text-rose-600">Choose a subscription plan below to restore full access. Your existing business data remains saved.</p></div> : <p className="mt-4 text-sm text-slate-500">No active subscription or free trial is linked to this account.</p>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
     <div className="text-sm font-black">Available Plans</div>
     <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {plans.map(p=><div key={p.id} className={'rounded-xl border p-4 '+(selectedPlanId===p.id?'border-sky-500 bg-sky-50/60 dark:bg-sky-950/20':'border-slate-200 dark:border-slate-700')}>
       <div className="font-black">{p.name}</div>
       <div className="mt-2 text-2xl font-black tabular-nums">{money(p.price_bdt)}<span className="text-xs font-medium text-slate-500"> / {p.billing_interval==='month'?'month':'year'}</span></div>
       <p className="mt-1 text-xs text-slate-500">{p.description}</p>
       {p.id==='yearly'&&<p className="mt-2 text-xs font-bold text-emerald-700">Save ৳১৮৯ compared with 12 monthly payments.</p>}
       <button type="button" onClick={()=>setSelectedPlanId(p.id)} className={'mt-4 w-full rounded-xl px-3 py-2.5 text-xs font-black '+(selectedPlanId===p.id?'bg-sky-700 text-white':'border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200')}>{selectedPlanId===p.id?'Selected':'Choose plan'}</button>
      </div>)}
     </div>
     {!plans.length&&<p className="mt-3 text-sm text-slate-500">No active subscription plans are available.</p>}
    </section>
   </div>

   <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="mb-4 flex items-center gap-2 text-sm font-black"><Wallet size={18} className="text-pink-600"/>Pay with Nagad Personal</div>
    {selectedPlan&&<div className="mb-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70"><div className="text-xs text-slate-500">Selected plan</div><div className="mt-1 flex flex-wrap items-center justify-between gap-2"><span className="font-black">{selectedPlan.name}</span><span className="text-xl font-black">{money(selectedPlan.price_bdt)}</span></div><div className="mt-1 text-xs text-slate-500">Manual renewal only. Your subscription starts or extends after the payment is verified.</div></div>}
    {paymentSettings?.is_active&&paymentSettings.receiver_number?<>
     <div className="rounded-xl border border-pink-200 bg-pink-50 p-4 dark:border-pink-900 dark:bg-pink-950/20">
      <div className="text-xs font-bold uppercase tracking-wider text-pink-700 dark:text-pink-300">Send Money to this Nagad Personal Number</div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><div className="text-2xl font-black tracking-wider text-slate-900 dark:text-white">{paymentSettings.receiver_number}</div><button type="button" onClick={()=>void copyReceiver()} className="inline-flex items-center gap-2 rounded-lg border border-pink-300 bg-white px-3 py-2 text-xs font-bold text-pink-700"><Copy size={14}/>Copy number</button></div>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Nagad app থেকে <b>Send Money</b> ব্যবহার করুন। Amount: <b>{selectedPlan?money(selectedPlan.price_bdt):'Choose a plan first'}</b></p>
     </div>
     <form onSubmit={submitPayment} className="mt-4 grid gap-3 md:grid-cols-2">
      <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Your Nagad sender number
       <input required inputMode="tel" autoComplete="tel" value={senderNumber} onChange={e=>setSenderNumber(e.target.value)} placeholder="01XXXXXXXXX" className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"/>
      </label>
      <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Nagad Transaction ID
       <input required value={nagadTransactionId} onChange={e=>setNagadTransactionId(e.target.value.toUpperCase())} placeholder="Enter TxnID from receipt" className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm uppercase dark:border-slate-700 dark:bg-slate-800"/>
      </label>
      <div className="md:col-span-2"><button disabled={!selectedPlan||submitting} className="w-full rounded-xl bg-sky-700 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{submitting?'Submitting…':'I have sent the payment — Submit for verification'}</button></div>
     </form>
     <p className="mt-3 flex items-start gap-2 text-[11px] text-slate-500"><LockKeyhole size={13} className="mt-0.5 shrink-0"/>Never enter or share your Nagad PIN or OTP. Enter only the sender number and transaction ID. Do not submit until Send Money is successful.</p>
    </>:<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/20">Nagad Personal receiver number has not been configured yet. The owner must save the receiving number below before customers can submit payments.</div>}
   </section>

   <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="mb-4 flex items-center gap-2 text-sm font-black"><Clock3 size={17}/>My Payment Submissions</div>
    <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500 dark:bg-slate-800"><tr>{['Date','Plan','Amount','Nagad Txn ID','Status','Review note'].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{submissions.map(x=><tr key={x.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3">{dateLabel(x.created_at)}</td><td className="p-3">{x.subscription_plans?.name||x.plan_id}</td><td className="p-3 font-bold">{money(x.amount)}</td><td className="p-3 font-mono text-xs">{x.nagad_transaction_id}</td><td className="p-3"><span className={'rounded-full px-2 py-1 text-[10px] font-bold '+(x.status==='approved'?'bg-emerald-100 text-emerald-700':x.status==='rejected'?'bg-rose-100 text-rose-700':'bg-amber-100 text-amber-800')}>{x.status}</span></td><td className="p-3 text-xs text-slate-500">{safeText(x.reviewer_note,'—')}</td></tr>)}</tbody></table></div>
    {!submissions.length&&<p className="py-6 text-center text-sm text-slate-500">You have not submitted a Nagad payment yet.</p>}
   </section>

   {isAdmin&&<section className="space-y-4 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm dark:border-amber-900 dark:bg-slate-900">
    <div><div className="text-sm font-black">Owner Controls</div><p className="mt-1 text-xs text-slate-500">Only the registered billing owner can change the receiving number or verify payments.</p></div>
    <form onSubmit={saveReceiver} className="flex flex-col gap-3 sm:flex-row sm:items-end">
     <label className="flex-1 text-xs font-bold text-slate-600 dark:text-slate-300">Your Nagad Personal receiving number
      <input required inputMode="tel" value={receiverDraft} onChange={e=>setReceiverDraft(e.target.value)} placeholder="01XXXXXXXXX" className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"/>
     </label>
     <button disabled={savingReceiver} className="rounded-xl bg-slate-900 px-5 py-3 text-xs font-black text-white dark:bg-white dark:text-slate-900">{savingReceiver?'Saving…':'Save receiving number'}</button>
    </form>
    <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
     <div className="mb-3 flex items-center justify-between"><div className="text-sm font-black">Pending payment verification</div><span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">{pendingSubmissions.length} pending</span></div>
     {pendingSubmissions.length?<div className="space-y-3">{pendingSubmissions.map(x=><div key={x.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="font-black">{x.subscription_plans?.name||x.plan_id} · {money(x.amount)}</div><div className="mt-1 text-xs text-slate-500">Sender: {x.sender_number} · TxnID: <b className="font-mono">{x.nagad_transaction_id}</b></div><div className="mt-1 text-xs text-slate-500">Received on: {x.receiver_number} · Submitted: {dateLabel(x.created_at)}</div></div><span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">PENDING</span></div><div className="mt-3 flex flex-wrap gap-2"><button disabled={reviewingId===x.id} onClick={()=>void reviewPayment(x.id,true)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white"><CheckCircle2 size={14}/>Approve after verification</button><button disabled={reviewingId===x.id} onClick={()=>void reviewPayment(x.id,false)} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700"><XCircle size={14}/>Reject</button></div></div>)}</div>:<p className="py-4 text-center text-sm text-slate-500">No pending Nagad payment submissions.</p>}
     <p className="mt-3 text-[11px] text-amber-800 dark:text-amber-300">Before approving, open your Nagad app and confirm the received amount, sender number and exact Transaction ID in your transaction history. A customer-submitted TxnID alone is not proof of payment.</p>
    </div>
   </section>}

   <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="mb-4 flex items-center gap-2 text-sm font-black"><CreditCard size={17}/>Verified Transaction History</div>
    <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500 dark:bg-slate-800"><tr>{['Transaction','Plan','Date','Method','Amount','Status'].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{transactions.map(tx=><tr key={tx.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3 font-bold">{tx.transaction_no}</td><td className="p-3">{tx.subscription_plans?.name||tx.plan_id}</td><td className="p-3">{dateLabel(tx.paid_at||tx.created_at)}</td><td className="p-3">{safeText(tx.payment_method,tx.provider)}</td><td className="p-3 font-bold">{money(tx.amount)}</td><td className="p-3 capitalize">{tx.status}</td></tr>)}</tbody></table></div>
    {!transactions.length&&<p className="py-8 text-center text-sm text-slate-500">No verified subscription transactions yet.</p>}
   </section>
  </>}

 </div>;
};
export default SubscriptionBilling;