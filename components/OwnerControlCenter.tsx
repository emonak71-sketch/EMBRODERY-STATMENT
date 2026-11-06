import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Headset, LogOut, ShieldCheck, RefreshCw, Settings } from 'lucide-react';
import SubscriptionBilling from './SubscriptionBilling';
import OwnerSupportInbox from './OwnerSupportInbox';
import NotificationCenter from './NotificationCenter';
import OwnerUpdateSettings from './OwnerUpdateSettings';

type OwnerUser = { id: string; email: string };
const OwnerControlCenter: React.FC<{user:OwnerUser;onLogout:()=>void}> = ({user,onLogout}) => {
  const [section,setSection]=useState<'overview'|'customers'|'support'|'settings'>('overview');
  useEffect(()=>{
    const openSettings=()=>setSection('settings');
    window.addEventListener('embroidery:owner-open-updates',openSettings);
    return()=>window.removeEventListener('embroidery:owner-open-updates',openSettings);
  },[]);
  return (
    <div className="owner-control-shell min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/embroidery-statement-mark.svg" alt="" className="h-10 w-10 rounded-xl bg-slate-950 p-1.5"/>
            <div className="min-w-0"><div className="truncate text-sm font-black tracking-tight">EMBROIDERY STATEMENT</div><div className="text-[9px] font-black uppercase tracking-[.2em] text-sky-600">Owner Control Center</div></div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter userId={user.id}/>
            <div className="hidden max-w-[220px] truncate text-right text-[11px] font-semibold text-slate-500 sm:block">{user.email}</div>
            <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"><LogOut size={14}/> <span className="hidden sm:inline">Sign out</span></button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1600px] gap-5 p-4 sm:p-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="owner-sidebar h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2 px-3 py-3 text-xs font-black uppercase tracking-widest text-slate-400"><ShieldCheck size={15} className="text-emerald-600"/> Owner Workspace</div>
          {[
            {id:'overview',label:'Overview',icon:<LayoutDashboard size={17}/>},
            {id:'customers',label:'Customers & Access',icon:<Users size={17}/>},
            {id:'support',label:'Support Inbox',icon:<Headset size={17}/>},
            {id:'settings',label:'Settings',icon:<Settings size={17}/>},
          ].map(item=><button key={item.id} onClick={()=>setSection(item.id as any)} className={'mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-black transition '+(section===item.id?'bg-sky-600 text-white shadow-lg shadow-sky-900/15':'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')}>{item.icon}{item.label}</button>)}
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-[10px] leading-5 text-slate-500 dark:bg-slate-800">This portal is restricted by the server-side Owner role. Customer accounts cannot grant themselves access.</div>
        </aside>
        <main className="owner-main min-w-0 space-y-5">
          {section==='overview'&&<section className="space-y-5">
            <div><div className="text-[10px] font-black uppercase tracking-[.2em] text-sky-600">Operations dashboard</div><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Welcome to your control center</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Manage the complete customer lifecycle from one owner account. Subscription changes and support replies sync to customer Web, PWA, Windows and Android sessions through the shared backend.</p></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <button onClick={()=>setSection('customers')} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950"><Users size={20}/></div><div className="text-sm font-black">Customer & Subscription Manager</div><p className="mt-2 text-xs leading-5 text-slate-500">Search by registered Gmail or saved mobile number, then grant 30, 90, 180, 365 or custom days.</p></button>
              <button onClick={()=>setSection('support')} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950"><Headset size={20}/></div><div className="text-sm font-black">Customer Support Inbox</div><p className="mt-2 text-xs leading-5 text-slate-500">Read AI conversations, view customer reports, reply and resolve issues.</p></button>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950"><RefreshCw size={20}/></div><div className="text-sm font-black">Shared Platform</div><p className="mt-2 text-xs leading-5 text-slate-500">One account and one subscription record across customer web, PWA, desktop and Android clients.</p></div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"><b>Payment workflow:</b> Customer sends money to your Nagad Personal number. You verify it outside the app, then activate access here. No payment gateway is required.</div>
          </section>}
          {section==='customers'&&<SubscriptionBilling ownerMode/>}
          {section==='support'&&<OwnerSupportInbox userId={user.id}/>}
          {section==='settings'&&<OwnerUpdateSettings/>}
        </main>
      </div>
    </div>
  );
};
export default OwnerControlCenter;
