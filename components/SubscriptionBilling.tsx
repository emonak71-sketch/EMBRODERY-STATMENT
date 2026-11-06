import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays, CheckCircle2, Clock3, CreditCard, History, LockKeyhole,
  RefreshCw, Search, ShieldCheck, UserRound, CalendarClock, Phone, Save
} from 'lucide-react';
import { dbService } from '../services/supabaseService';
import OwnerCustomerDirectory from './OwnerCustomerDirectory';

type Subscription = {
  id:string;
  status:string;
  current_period_start:string;
  current_period_end:string;
  cancel_at_period_end:boolean;
  subscription_plans?:{name:string;billing_interval:string}|null;
};
type BillingTransaction = {
  id:string;
  transaction_no:string;
  plan_id:string;
  amount:number;
  currency:string;
  status:string;
  provider:string;
  payment_method?:string|null;
  created_at:string;
  paid_at?:string|null;
  subscription_plans?:{name:string;billing_interval:string}|null;
};
type AccessStatus = {
  trial_started_at:string|null;
  trial_ends_at:string|null;
  is_trial_active:boolean;
  is_trial_expired:boolean;
  has_access:boolean;
  access_source:'owner_admin'|'owner_grant'|'subscription'|'free_trial'|'expired';
  access_until:string|null;
  manual_access_starts_at:string|null;
  manual_access_until:string|null;
  subscription_access_until:string|null;
}|null;
type CustomerLookup = {
  customer_id:string;
  customer_email:string;
  customer_phone:string|null;
  business_name:string;
  account_created_at:string;
  email_verified:boolean;
  trial_ends_at:string|null;
  subscription_access_until:string|null;
  manual_access_starts_at:string|null;
  manual_access_until:string|null;
  access_until:string|null;
  access_source:string;
};
type AccessGrant = {
  grant_id:string;
  granted_days:number;
  payment_date:string|null;
  payment_amount_bdt:number|null;
  payment_method:string|null;
  payment_reference:string|null;
  starts_at:string;
  ends_at:string;
  note:string|null;
  revoked_at:string|null;
  created_at:string;
  granted_by_email:string|null;
};

const money=(n:number)=>new Intl.NumberFormat('en-BD',{style:'currency',currency:'BDT',maximumFractionDigits:2}).format(Number(n)||0);
const dateLabel=(value?:string|null)=>value?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'—';
const shortDate=(value?:string|null)=>value?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(new Date(value)):'—';

const SubscriptionBilling:React.FC<{ownerMode?:boolean;onAccessRefresh?:()=>void|Promise<void>}>=({ownerMode=false,onAccessRefresh})=>{
 const [subscription,setSubscription]=useState<Subscription|null>(null);
 const [transactions,setTransactions]=useState<BillingTransaction[]>([]);
 const [accessStatus,setAccessStatus]=useState<AccessStatus>(null);
 const [isAdmin,setIsAdmin]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');

 const [customerLookupInput,setCustomerLookupInput]=useState('');
 const [customerPhone,setCustomerPhone]=useState('');
 const [savingPhone,setSavingPhone]=useState(false);
 const [customer,setCustomer]=useState<CustomerLookup|null>(null);
 const [grantHistory,setGrantHistory]=useState<AccessGrant[]>([]);
 const [durationChoice,setDurationChoice]=useState('30');
 const [customDays,setCustomDays]=useState('30');
 const [paymentNote,setPaymentNote]=useState('');
 const [paymentDate,setPaymentDate]=useState(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka'}).format(new Date()));
 const [paymentAmount,setPaymentAmount]=useState('');
 const [paymentMethod,setPaymentMethod]=useState('Nagad Personal');
 const [paymentReference,setPaymentReference]=useState('');
 const [searching,setSearching]=useState(false);
 const [granting,setGranting]=useState(false);
 const [directoryRevision,setDirectoryRevision]=useState(0);

 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{
   const [s,t,access,admin]=await Promise.all([
    dbService.getMySubscription(),
    dbService.getMyBillingTransactions(),
    dbService.getMyTrialStatus(),
    ownerMode ? dbService.isBillingAdmin() : Promise.resolve(false)
   ]);
   if(ownerMode&&!admin)throw new Error('Owner access required. Sign in with the authorised Owner account.');
   setSubscription(s as Subscription|null);
   setTransactions(t as BillingTransaction[]);
   setIsAdmin(Boolean(ownerMode&&admin));
   setAccessStatus(access as AccessStatus);
   await onAccessRefresh?.();
  }catch(e:any){setError(e.message||'Could not load subscription access information.');}
  finally{setLoading(false);}
 },[ownerMode,onAccessRefresh]);
 useEffect(()=>{void load();},[load]);

 const searchCustomer=async(e?:React.FormEvent, selectedEmail?:string)=>{
  e?.preventDefault();
  if(searching||savingPhone||granting)return;
  const identifier=(selectedEmail??customerLookupInput).trim();
  if(!identifier){setError('Enter the customer Gmail or saved mobile number.');return;}
  setSearching(true);setError('');setNotice('');setCustomer(null);setCustomerPhone('');setGrantHistory([]);
  try{
   const found=await dbService.ownerSearchCustomer(identifier);
   if(!found){
    setError(identifier.includes('@')
     ?'No customer account found with this Gmail. Ask the customer to register and verify this email first.'
     :'No customer is linked to this mobile number yet. Search by the registered Gmail first, save the number, then search by phone.');
    return;
   }
   const record=found as CustomerLookup;
   setCustomer(record);
   setCustomerPhone(record.customer_phone||'');
   const history=await dbService.ownerGetCustomerAccessHistory(record.customer_id);
   setGrantHistory(history as AccessGrant[]);
  }catch(e:any){setError(e.message||'Customer lookup failed.');}
  finally{setSearching(false);}
 };

 const saveCustomerPhone=async()=>{
  if(!customer||savingPhone)return;
  if(!customer.email_verified){setError('Customer must verify the registered Gmail before a phone number can be linked.');return;}
  if(!customerPhone.trim()){setError('Enter the customer mobile number first.');return;}
  setSavingPhone(true);setError('');setNotice('');
  try{
   const saved=await dbService.ownerSaveCustomerPhone(customer.customer_email,customerPhone);
   if(!saved)throw new Error('The customer mobile number was not saved.');
   setCustomer(current=>current?{...current,customer_phone:saved.customer_phone}:current);
   setCustomerPhone(saved.customer_phone);
   setDirectoryRevision(value=>value+1);
   setNotice(`Mobile number saved: ${saved.customer_phone}. You can now search this number to retrieve ${saved.customer_email}. The customer will continue signing in with Gmail.`);
  }catch(e:any){setError(e.message||'Could not save the customer mobile number.');}
  finally{setSavingPhone(false);}
 };

 const grantAccess=async()=>{
  if(!customer||granting)return;
  const days=durationChoice==='custom'?Number(customDays):Number(durationChoice);
  if(!Number.isInteger(days)||days<1||days>3650){setError('Enter a whole number between 1 and 3650 days.');return;}
  if(!customer.email_verified){setError('Customer must verify their registered email before access can be granted.');return;}
  const amount=Number(paymentAmount);
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka'}).format(new Date());
  if(!paymentDate||paymentDate>today){setError('Payment date must be today or earlier.');return;}
  if(paymentAmount.trim()===''||!Number.isFinite(amount)||amount<0||amount>99999999){setError('Enter the verified payment amount in BDT. Use 0 only for complimentary access.');return;}
  const confirmed=window.confirm(
   `Grant ${days} days of app access to ${customer.customer_email} and record ${money(amount)} received by ${paymentMethod} on ${paymentDate}? Any remaining trial or current paid access will be preserved.`
  );
  if(!confirmed)return;
  setGranting(true);setError('');setNotice('');
  try{
   const result=await dbService.ownerGrantCustomerAccess(customer.customer_email,days,{
    note:paymentNote,paymentDate,amount,method:paymentMethod,reference:paymentReference
   });
   if(!result)throw new Error('The access grant was not returned by the server.');
   setNotice(`Access granted for ${days} days. Payment recorded: ${money(amount)} on ${paymentDate}. Starts: ${dateLabel(result.starts_at)} · Ends: ${dateLabel(result.ends_at)}.`);
   setPaymentNote('');setPaymentReference('');setPaymentAmount('');
   const updated=await dbService.ownerSearchCustomer(customer.customer_email);
   if(updated){
    setCustomer(updated as CustomerLookup);
    const history=await dbService.ownerGetCustomerAccessHistory(customer.customer_id);
    setGrantHistory(history as AccessGrant[]);
   }
  }catch(e:any){setError(e.message||'Could not grant customer access.');}
  finally{setGranting(false);}
 };

 const trialDaysRemaining=accessStatus?.is_trial_active&&accessStatus.trial_ends_at
  ?Math.max(0,Math.ceil((new Date(accessStatus.trial_ends_at).getTime()-Date.now())/86_400_000)):0;
 const activeGrant=accessStatus?.access_source==='owner_grant';
 const activeSubscription=accessStatus?.access_source==='subscription';

 return <div className="mx-auto max-w-7xl space-y-6 pb-10">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
   <div>
    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-sky-700">
     {isAdmin?<ShieldCheck size={13}/>:<CreditCard size={13}/>} {isAdmin?'Owner Control Center':'Account Access'}
    </div>
    <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">{isAdmin?'Owner Subscription Dashboard':'Subscription & Access'}</h1>
    <p className="mt-1 text-sm text-slate-500">{isAdmin?'Find a registered customer by email and manually activate the exact access period after verifying payment.':'Check your trial or subscription status and contact the app owner to purchase or renew access.'}</p>
   </div>
   <button onClick={()=>void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
    <RefreshCw size={14} className={loading?'animate-spin':''}/>Refresh
   </button>
  </div>

  {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
  {notice&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

  {loading?<div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading access records…</div>:<>
   <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center gap-2 text-sm font-black"><ShieldCheck size={17} className="text-emerald-600"/>{isAdmin?'Owner Account':'Your Current Access'}</div>
    {isAdmin?<div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div><div className="text-xl font-black text-emerald-700">Unlimited Owner Access</div><p className="mt-1 text-xs text-slate-500">This account is registered as the billing owner. It does not need a customer subscription.</p></div><span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-800">OWNER VERIFIED</span></div>
    :accessStatus?.access_source==='owner_admin'?<div className="mt-3 space-y-2"><div className="text-xl font-black text-emerald-700">Account Access Active</div><p className="text-sm text-slate-600 dark:text-slate-300">Your account is active. Customer sign-in and account data remain separate from Owner Control Center permissions.</p></div>
    :activeGrant?<div className="mt-3 space-y-2"><div className="text-xl font-black text-emerald-700">Owner-Activated Subscription</div><div className="text-sm text-slate-600 dark:text-slate-300">Your access is active until <b>{dateLabel(accessStatus?.manual_access_until||accessStatus?.access_until)}</b>.</div></div>
    :activeSubscription?<div className="mt-3 space-y-2"><div className="text-xl font-black text-emerald-700">Subscription Active</div><div className="text-sm text-slate-600 dark:text-slate-300">Access until <b>{dateLabel(accessStatus?.subscription_access_until||accessStatus?.access_until)}</b>.</div></div>
    :accessStatus?.is_trial_active?<div className="mt-3 space-y-2"><div className="text-xl font-black text-emerald-700">15-Day Free Trial</div><div className="text-sm font-bold text-emerald-700">{trialDaysRemaining} {trialDaysRemaining===1?'day':'days'} remaining</div><div className="text-xs text-slate-500">Trial ends: {dateLabel(accessStatus.trial_ends_at)}</div>{accessStatus.manual_access_starts_at&&accessStatus.manual_access_until&&<p className="text-xs text-sky-700">A paid access period is scheduled to start on {dateLabel(accessStatus.manual_access_starts_at)}.</p>}</div>
    :<div className="mt-3 space-y-2"><div className="text-xl font-black text-rose-600">Access Expired</div><p className="text-sm text-slate-600 dark:text-slate-300">Your trial or subscription has ended. Contact the app owner and provide the exact Gmail address used for registration. After payment is verified, the owner will activate your account.</p></div>}
   </section>

   {isAdmin?<section className="space-y-5 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm dark:border-amber-900 dark:bg-slate-900">
    <div>
     <div className="flex items-center gap-2 text-base font-black"><UserRound size={18} className="text-amber-600"/>Customer Access Manager</div>
     <p className="mt-1 text-sm text-slate-500">Customers register and sign in with Gmail. Search by their registered Gmail or a saved Bangladesh mobile number; verify payment, then assign access.</p>
    </div>
    <OwnerCustomerDirectory refreshKey={directoryRevision} disabled={searching||savingPhone||granting} onSelect={email=>{setCustomerLookupInput(email);void searchCustomer(undefined,email);}}/>
    <form onSubmit={searchCustomer} className="flex flex-col gap-3 sm:flex-row">
     <label className="min-w-0 flex-1 text-xs font-bold text-slate-600 dark:text-slate-300">Customer Gmail or saved mobile number
      <input type="text" required inputMode={customerLookupInput.includes('@')?'email':'tel'} autoComplete="off" value={customerLookupInput} onChange={e=>setCustomerLookupInput(e.target.value)} placeholder="customer@gmail.com or 017XXXXXXXX" className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"/>
     </label>
     <button type="submit" disabled={searching||savingPhone||granting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-black text-white disabled:opacity-50 dark:bg-sky-700">
      <Search size={15}/>{searching?'Searching…':'Find Customer'}
     </button>
    </form>
    <p className="text-[11px] text-slate-500">The registered Gmail is retrieved directly from the customer's verified account. A mobile number is only a private admin lookup key; it does not replace Gmail sign-in.</p>

    {customer&&<div className="space-y-5 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
     <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
       <div className="text-lg font-black text-slate-900 dark:text-white">{customer.business_name||'Customer Account'}</div>
       <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Registered Gmail · Customer sign-in</div>
       <div className="mt-1 break-all text-sm font-semibold text-slate-700 dark:text-slate-200">{customer.customer_email}</div>
       <div className="mt-1 text-xs text-slate-400">Registered: {dateLabel(customer.account_created_at)}</div>
      </div>
      <span className={'rounded-full px-3 py-1.5 text-[10px] font-black '+(customer.email_verified?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-800')}>
       {customer.email_verified?'EMAIL VERIFIED':'EMAIL NOT VERIFIED'}
      </span>
     </div>

     <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-4 dark:border-sky-900 dark:bg-sky-950/20">
      <div className="flex items-center gap-2 text-sm font-black"><Phone size={16} className="text-sky-700 dark:text-sky-300"/>Customer Mobile Number</div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
       <input type="tel" inputMode="tel" autoComplete="off" maxLength={20} value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} placeholder="017XXXXXXXX or +88017XXXXXXXX" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"/>
       <button type="button" onClick={()=>void saveCustomerPhone()} disabled={savingPhone||!customer.email_verified||!customerPhone.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
        <Save size={14}/>{savingPhone?'Saving…':customer.customer_phone?'Update Number':'Save Number'}
       </button>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-slate-500">Save this customer's Bangladesh mobile number once. Later, searching with the number will automatically retrieve the Gmail shown above. Gmail remains the customer's login ID.</p>
     </div>

     <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><div className="text-[10px] font-bold uppercase text-slate-400">Current Status</div><div className="mt-1 text-sm font-black">{customer.access_source==='free_trial'?'Trial Version':customer.access_source==='owner_grant'||customer.access_source==='subscription'?'Pro Version':'Expired / No Access'}</div></div>
      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><div className="text-[10px] font-bold uppercase text-slate-400">Access Until</div><div className="mt-1 text-sm font-black">{dateLabel(customer.access_until)}</div></div>
      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><div className="text-[10px] font-bold uppercase text-slate-400">Trial Ends</div><div className="mt-1 text-sm font-black">{dateLabel(customer.trial_ends_at)}</div></div>
      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><div className="text-[10px] font-bold uppercase text-slate-400">Owner Grant Ends</div><div className="mt-1 text-sm font-black">{dateLabel(customer.manual_access_until)}</div></div>
     </div>

     {customer.manual_access_starts_at&&new Date(customer.manual_access_starts_at).getTime()>Date.now()&&<p className="rounded-xl bg-sky-50 p-3 text-xs font-semibold text-sky-800 dark:bg-sky-950/30 dark:text-sky-200">A future owner-granted period is already scheduled to start on {dateLabel(customer.manual_access_starts_at)}.</p>}

     <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
      <div className="mb-3 flex items-center gap-2 text-sm font-black"><CalendarDays size={16}/>Assign Subscription Duration</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
       {[{value:'30',label:'30 Days'},{value:'90',label:'90 Days'},{value:'180',label:'6 Months · 180d'},{value:'365',label:'1 Year · 365d'}].map(option=><button key={option.value} type="button" onClick={()=>setDurationChoice(option.value)} className={'rounded-xl border px-3 py-3 text-xs font-black transition '+(durationChoice===option.value?'border-sky-600 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200':'border-slate-200 text-slate-600 hover:border-sky-300 dark:border-slate-700 dark:text-slate-300')}>{option.label}</button>)}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
       <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Custom duration
        <div className="mt-1 flex gap-2">
         <input type="number" min="1" max="3650" step="1" value={customDays} onChange={e=>{setCustomDays(e.target.value);setDurationChoice('custom');}} className={'w-full rounded-xl border p-3 text-sm dark:bg-slate-800 '+(durationChoice==='custom'?'border-sky-500':'border-slate-200 dark:border-slate-700')}/>
         <span className="flex items-center rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-500 dark:bg-slate-800">Days</span>
        </div>
       </label>
       <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Payment date
        <input required type="date" max={new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka'}).format(new Date())} value={paymentDate} onChange={e=>setPaymentDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"/>
       </label>
       <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Amount received (BDT)
        <input required type="number" min="0" max="99999999" step="0.01" value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} placeholder="e.g. 99.00" className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"/>
       </label>
       <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Payment method
        <select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800">
         <option value="Nagad Personal">Nagad Personal</option><option value="Cash">Cash</option><option value="Bank Transfer">Bank Transfer</option><option value="Other">Other</option>
        </select>
       </label>
       <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Payment reference / Nagad TxnID (optional)
        <input value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} maxLength={160} placeholder="Enter transaction reference" className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"/>
       </label>
       <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Internal note (optional)
        <input value={paymentNote} onChange={e=>setPaymentNote(e.target.value)} maxLength={160} placeholder="Owner note" className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"/>
       </label>
      </div>
      <p className="mt-3 flex items-start gap-2 text-[11px] text-slate-500"><LockKeyhole size={13} className="mt-0.5 shrink-0"/>The new period starts after any remaining trial, subscription, or previously granted access. No existing days are lost.</p>
      <button type="button" onClick={()=>void grantAccess()} disabled={granting||!customer.email_verified} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
       <CheckCircle2 size={16}/>{granting?'Activating…':`Grant ${durationChoice==='custom'?customDays:durationChoice} Days of Access`}
      </button>
     </div>

     <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
      <div className="mb-3 flex items-center gap-2 text-sm font-black"><History size={16}/>Access Grant History</div>
      {grantHistory.length?<div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500 dark:bg-slate-800"><tr>{['Payment Date','Amount','Method','Txn Reference','Duration','Access Starts','Access Expires','Status'].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{grantHistory.map(row=><tr key={row.grant_id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3">{shortDate(row.payment_date||row.created_at)}</td><td className="p-3 font-black">{row.payment_amount_bdt===null?'—':money(Number(row.payment_amount_bdt))}</td><td className="p-3">{row.payment_method||'—'}</td><td className="p-3">{row.payment_reference||row.note||'—'}</td><td className="p-3 font-black">{row.granted_days} days</td><td className="p-3">{dateLabel(row.starts_at)}</td><td className="p-3">{dateLabel(row.ends_at)}</td><td className="p-3"><span className={'rounded-full px-2 py-1 font-bold '+(row.revoked_at?'bg-rose-100 text-rose-700':new Date(row.ends_at).getTime()>Date.now()?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-600')}>{row.revoked_at?'Revoked':new Date(row.ends_at).getTime()>Date.now()?'Active / Scheduled':'Expired'}</span></td></tr>)}</tbody></table></div>:<p className="py-5 text-center text-xs text-slate-500">No manual access grants have been recorded for this customer.</p>}
     </div>
    </div>}
   </section>:<section className="rounded-2xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-900 dark:bg-sky-950/30">
    <div className="flex items-center gap-2 text-sm font-black text-sky-900 dark:text-sky-100"><CalendarClock size={17}/>How to activate or renew</div>
    <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-sky-900 dark:text-sky-100">
     <li>Contact the app owner to confirm the subscription duration and price.</li>
     <li>Send the payment directly through Nagad Personal, outside this app.</li>
     <li>Send the owner the exact Gmail address used for your verified account and your payment reference.</li>
     <li>The owner will activate your access. You can refresh this page to see the expiry date.</li>
    </ol>
    <p className="mt-3 flex items-start gap-2 text-xs text-sky-800 dark:text-sky-200"><LockKeyhole size={13} className="mt-0.5 shrink-0"/>Never share your Nagad PIN or OTP. Your customer and transaction data remain saved if access expires.</p>
   </section>}

   {!isAdmin&&<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="mb-4 flex items-center gap-2 text-sm font-black"><CreditCard size={17}/>Previous Subscription Payments</div>
    <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500 dark:bg-slate-800"><tr>{['Transaction','Plan','Date','Method','Amount','Status'].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{transactions.map(tx=><tr key={tx.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3 font-bold">{tx.transaction_no}</td><td className="p-3">{tx.subscription_plans?.name||tx.plan_id}</td><td className="p-3">{dateLabel(tx.paid_at||tx.created_at)}</td><td className="p-3">{tx.payment_method||tx.provider||'—'}</td><td className="p-3 font-bold">{money(tx.amount)}</td><td className="p-3 capitalize">{tx.status}</td></tr>)}</tbody></table></div>
    {!transactions.length&&<p className="py-6 text-center text-sm text-slate-500">No previous subscription payment records.</p>}
   </section>}
  </>}
 </div>;
};

export default SubscriptionBilling;
