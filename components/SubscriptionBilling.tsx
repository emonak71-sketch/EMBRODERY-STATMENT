import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CreditCard, Download, FileText, Printer, RefreshCw, ShieldCheck } from 'lucide-react';
import { toPng } from 'html-to-image';
import { dbService } from '../services/supabaseService';
import { User } from '../types';

type Plan = { id:string; name:string; billing_interval:'month'|'year'; duration_days:number; price_bdt:number; max_workers:number|null; description:string; features:unknown };
type Subscription = { id:string; status:string; current_period_start:string; current_period_end:string; cancel_at_period_end:boolean; subscription_plans?:Plan };
type BillingTransaction = { id:string; transaction_no:string; plan_id:string; amount:number; currency:string; status:string; provider:string; payment_method?:string|null; created_at:string; paid_at?:string|null; subscription_plans?:{name:string;billing_interval:string}|null };
type BillingInvoice = { id:string; transaction_id:string; invoice_number:string; seller_snapshot:Record<string,unknown>; buyer_snapshot:Record<string,unknown>; line_items:Array<Record<string,unknown>>; subtotal:number; discount:number; tax:number; total:number; currency:string; issued_at:string };
const money=(n:number)=>new Intl.NumberFormat('en-BD',{style:'currency',currency:'BDT',maximumFractionDigits:2}).format(Number(n)||0);
const dateLabel=(value?:string|null)=>value?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'—';
const safeText=(value:unknown,fallback='—')=>typeof value==='string'&&value.trim()?value:fallback;

const SubscriptionBilling:React.FC<{user:User}>=({user})=>{
 const [plans,setPlans]=useState<Plan[]>([]);
 const [subscription,setSubscription]=useState<Subscription|null>(null);
 const [transactions,setTransactions]=useState<BillingTransaction[]>([]);
 const [invoices,setInvoices]=useState<BillingInvoice[]>([]);
 const [selected,setSelected]=useState<BillingInvoice|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const invoiceRef=useRef<HTMLDivElement>(null);
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{
   const [p,s,t,i]=await Promise.all([dbService.getSubscriptionPlans(),dbService.getMySubscription(),dbService.getMyBillingTransactions(),dbService.getMyBillingInvoices()]);
   setPlans(p as Plan[]);setSubscription(s as Subscription|null);setTransactions(t as BillingTransaction[]);setInvoices(i as BillingInvoice[]);
  }catch(e:any){setError(e.message||'Could not load subscription and billing history.');}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 const invoiceByTransaction=useMemo(()=>new Map(invoices.map(i=>[i.transaction_id,i])),[invoices]);
 const selectedTransaction=transactions.find(t=>t.id===selected?.transaction_id);
 const seller=selected?.seller_snapshot||{};
 const buyer=selected?.buyer_snapshot||{};
 const exportImage=async()=>{
  if(!invoiceRef.current||!selected)return;
  try{const image=await toPng(invoiceRef.current,{pixelRatio:3,cacheBust:true,backgroundColor:'#ffffff'});const link=document.createElement('a');link.href=image;link.download=selected.invoice_number+'.png';link.click();}
  catch(e:any){setError(e.message||'Invoice image could not be generated.');}
 };
 const printInvoice=async()=>{
  if(!invoiceRef.current||!selected)return;
  const printWindow=window.open('','_blank');
  if(!printWindow){setError('Allow pop-ups to print this invoice.');return;}
  try{
   const image=await toPng(invoiceRef.current,{pixelRatio:2,cacheBust:true,backgroundColor:'#ffffff'});
   printWindow.document.open();
   printWindow.document.write('<!doctype html><html><head><title>'+selected.invoice_number+'</title><style>body{margin:0;padding:18px;background:#fff;display:flex;justify-content:center}img{width:100%;max-width:820px;height:auto}@media print{body{padding:0}img{max-width:100%;max-height:98vh;object-fit:contain}}</style></head><body><img src="'+image+'"></body></html>');
   printWindow.document.close();printWindow.onload=()=>{printWindow.focus();printWindow.print();};
  }catch(e:any){printWindow.close();setError(e.message||'Invoice could not be prepared for printing.');}
 };
 return <div className="mx-auto max-w-7xl space-y-6 pb-10">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
   <div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-sky-700"><CreditCard size={13}/> Account Billing</div><h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">Subscription & Billing</h1><p className="mt-1 text-sm text-slate-500">Manage your plan, payment history and invoices.</p></div>
   <button onClick={()=>void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><RefreshCw size={14} className={loading?'animate-spin':''}/>Refresh</button>
  </div>
  {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
  {loading?<div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading billing records…</div>:<>
   <div className="grid gap-4 lg:grid-cols-2">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
     <div className="flex items-center gap-2 text-sm font-black"><ShieldCheck size={17} className="text-emerald-600"/>Current Subscription</div>
     {subscription?<div className="mt-4 space-y-2"><div className="text-xl font-black">{subscription.subscription_plans?.name||subscription.id}</div><div className="text-sm text-slate-500">Status: <span className="font-bold capitalize text-emerald-700">{subscription.status}</span></div><div className="text-xs text-slate-500">Period start: {dateLabel(subscription.current_period_start)}</div><div className="text-xs text-slate-500">Renewal / expiry: {dateLabel(subscription.current_period_end)}</div>{subscription.cancel_at_period_end&&<p className="text-xs font-bold text-amber-700">Cancellation is scheduled at the end of this period.</p>}</div>:<p className="mt-4 text-sm text-slate-500">No active subscription is linked to this account yet.</p>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
     <div className="text-sm font-black">Available Plans</div>
     {plans.length?<div className="mt-3 grid gap-3 sm:grid-cols-2">{plans.map(p=><div key={p.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="font-black">{p.name}</div><div className="mt-2 text-xl font-black">{money(p.price_bdt)}<span className="text-xs font-medium text-slate-500"> / {p.billing_interval}</span></div><p className="mt-1 text-xs text-slate-500">{p.description}</p><p className="mt-2 text-xs text-slate-500">{p.max_workers?'Up to '+p.max_workers+' workers':'Worker limit not specified'}</p></div>)}</div>:<p className="mt-3 text-sm text-slate-500">Subscription plans will appear here once the commercial plans and payment gateway are configured.</p>}
    </section>
   </div>
   <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="mb-4 flex items-center gap-2 text-sm font-black"><CreditCard size={17}/>Transaction History</div>
    <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500 dark:bg-slate-800"><tr>{['Transaction','Plan','Date','Method','Amount','Status','Invoice'].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{transactions.map(tx=>{const inv=invoiceByTransaction.get(tx.id);return <tr key={tx.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3 font-bold">{tx.transaction_no}</td><td className="p-3">{tx.subscription_plans?.name||tx.plan_id}</td><td className="p-3">{dateLabel(tx.paid_at||tx.created_at)}</td><td className="p-3">{safeText(tx.payment_method,tx.provider)}</td><td className="p-3 font-bold">{money(tx.amount)}</td><td className="p-3 capitalize">{tx.status}</td><td className="p-3">{inv?<button onClick={()=>setSelected(inv)} className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">View {inv.invoice_number}</button>:'—'}</td></tr>})}</tbody></table></div>
    {!transactions.length&&<p className="py-8 text-center text-sm text-slate-500">No subscription transactions yet.</p>}
   </section>
  </>}
  {selected&&<div className="fixed inset-0 z-[300] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm"><div className="my-6 w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-black">Invoice {selected.invoice_number}</h2><p className="text-xs text-slate-500">{dateLabel(selected.issued_at)}</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>void exportImage()} className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white"><Download size={13} className="mr-1 inline"/>Save PNG</button><button onClick={()=>void printInvoice()} className="rounded-lg border px-3 py-2 text-xs font-bold dark:border-slate-700"><Printer size={13} className="mr-1 inline"/>Print</button><button onClick={()=>setSelected(null)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold dark:bg-slate-800">Close</button></div></div>
   <div className="max-h-[75vh] overflow-auto rounded-xl bg-slate-100 p-3 dark:bg-slate-950"><div ref={invoiceRef} className="mx-auto w-[720px] max-w-full bg-white p-8 text-slate-900">
    <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5"><div><div className="text-2xl font-black">EMBROIDERY STATEMENT</div><div className="mt-1 text-xs uppercase tracking-[.2em] text-slate-500">Subscription Tax Invoice</div></div><FileText size={32}/></div>
    <div className="mt-6 grid grid-cols-2 gap-5 text-sm"><div><div className="mb-1 text-xs uppercase text-slate-500">Billed By</div><div className="font-black">{safeText(seller.name,'Embroidery Statement')}</div><div>{safeText(seller.email,'')}</div><div>{safeText(seller.address,'')}</div></div><div><div className="mb-1 text-xs uppercase text-slate-500">Billed To</div><div className="font-black">{safeText(buyer.business_name,user.business_name)}</div><div>{safeText(buyer.email,user.email)}</div></div></div>
    <div className="mt-6 flex justify-between border-y py-3 text-sm"><span>Invoice Number: <b>{selected.invoice_number}</b></span><span>Transaction: <b>{selectedTransaction?.transaction_no||'—'}</b></span></div>
    <table className="mt-5 w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-slate-500"><th className="py-3">Description</th><th className="py-3 text-right">Amount</th></tr></thead><tbody>{(selected.line_items||[]).map((item,i)=><tr key={i} className="border-b"><td className="py-3">{safeText(item.description||item.name,'Subscription')}</td><td className="py-3 text-right font-bold">{money(Number(item.amount)||0)}</td></tr>)}</tbody></table>
    <div className="ml-auto mt-5 max-w-xs space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal</span><b>{money(selected.subtotal)}</b></div><div className="flex justify-between"><span>Discount</span><b>−{money(selected.discount)}</b></div><div className="flex justify-between"><span>Tax</span><b>{money(selected.tax)}</b></div><div className="flex justify-between border-t pt-3 text-lg font-black"><span>Total Paid</span><span>{money(selected.total)}</span></div></div>
    <div className="mt-10 border-t pt-4 text-center text-xs text-slate-500">Thank you for choosing Embroidery Statement. This invoice records the completed subscription payment.</div>
   </div></div>
  </div></div>}
 </div>;
};
export default SubscriptionBilling;