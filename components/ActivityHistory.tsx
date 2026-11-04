import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, Clock3, History, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { dbService } from '../services/supabaseService';
import { useLanguage } from '../contexts/LanguageContext';

type ActivityRow = {
  id: string; user_id: string; actor_id: string | null; table_name: string;
  record_id: string | null; action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null;
  changed_at: string;
};
const titleCase = (value: string) => value.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const ActivityHistory: React.FC = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const tr = (b: string, e: string) => bn ? b : e;
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const load = async () => {
    setLoading(true); setError('');
    try { setRows(await dbService.getActivityHistory(300) as ActivityRow[]); }
    catch (e: any) { setRows([]); setError(e.message || 'Could not load activity history. Apply the audit-history SQL migration first.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const modules = useMemo(() => Array.from(new Set(rows.map(r => r.table_name))).sort(), [rows]);
  const filtered = useMemo(() => rows.filter(r => {
    const haystack = [r.table_name, r.action, r.record_id, r.actor_id, JSON.stringify(r.old_data || {}), JSON.stringify(r.new_data || {})].join(' ').toLowerCase();
    return (moduleFilter === 'all' || r.table_name === moduleFilter) &&
      (actionFilter === 'all' || r.action === actionFilter) && haystack.includes(query.toLowerCase());
  }), [rows, moduleFilter, actionFilter, query]);
  const actionLabel = (action: string) => action === 'INSERT' ? tr('তৈরি', 'Created') : action === 'UPDATE' ? tr('পরিবর্তন', 'Updated') : tr('মুছে ফেলা', 'Deleted');
  const dateLabel = (value: string) => new Intl.DateTimeFormat(bn ? 'bn-BD' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' }).format(new Date(value));
  return <div className="mx-auto max-w-6xl space-y-6 pb-10">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500 dark:border-slate-700 dark:bg-slate-900"><ShieldCheck size={13}/> {tr('নিরাপত্তা ও জবাবদিহি','Governance & Accountability')}</div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{tr('কার্যক্রমের ইতিহাস','Activity History')}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{tr('আপনার ব্যবসার রেকর্ডে কে, কখন এবং কী পরিবর্তন করেছে তার অপরিবর্তনীয় লগ।','A chronological, append-only record of who changed business data, when it changed, and what changed.')}</p></div>
      <button onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>{tr('রিফ্রেশ','Refresh')}</button>
    </header>
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Activity size={15}/>{tr('মোট রেকর্ড','Total events')}</div><div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{rows.length}</div></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2 text-xs font-medium text-slate-500"><ArrowUpRight size={15}/>{tr('তৈরি ও আপডেট','Created & updated')}</div><div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{rows.filter(r => r.action !== 'DELETE').length}</div></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-200 dark:bg-slate-900"><div className="flex items-center gap-2 text-xs font-medium text-slate-500"><ArrowDownRight size={15}/>{tr('মুছে ফেলা','Deleted')}</div><div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{rows.filter(r => r.action === 'DELETE').length}</div></div>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid gap-3 md:grid-cols-[1fr_190px_170px]">
        <label className="relative block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={tr('কর্মী, রেকর্ড বা পরিবর্তন খুঁজুন','Search records, values or IDs')} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800"/></label>
        <select value={moduleFilter} onChange={e=>setModuleFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="all">{tr('সব মডিউল','All modules')}</option>{modules.map(m=><option key={m} value={m}>{titleCase(m)}</option>)}</select>
        <select value={actionFilter} onChange={e=>setActionFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="all">{tr('সব কার্যক্রম','All actions')}</option><option value="INSERT">{tr('তৈরি','Created')}</option><option value="UPDATE">{tr('পরিবর্তন','Updated')}</option><option value="DELETE">{tr('মুছে ফেলা','Deleted')}</option></select>
      </div>
    </section>
    {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{error}</div>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white"><History size={16}/>{tr('সাম্প্রতিক পরিবর্তন','Recent changes')}</div><span className="text-xs text-slate-400">{filtered.length} {tr('টি ইভেন্ট','events')}</span></div>
      {loading ? <div className="p-12 text-center text-sm text-slate-500"><RefreshCw className="mr-2 inline animate-spin" size={16}/>{tr('ইতিহাস লোড হচ্ছে...','Loading history...')}</div> :
       filtered.length === 0 ? <div className="p-12 text-center"><Clock3 className="mx-auto mb-3 text-slate-300" size={28}/><p className="text-sm font-medium text-slate-600 dark:text-slate-300">{tr('কোনো কার্যক্রম পাওয়া যায়নি','No activity found')}</p><p className="mt-1 text-xs text-slate-400">{error ? tr('SQL migration চালানোর পর আবার চেষ্টা করুন।','Run the audit-history SQL migration, then refresh.') : tr('ফিল্টার পরিবর্তন করুন অথবা নতুন পরিবর্তনের জন্য অপেক্ষা করুন।','Adjust the filters or wait for new changes.')}</p></div> :
       <div className="divide-y divide-slate-100 dark:divide-slate-800">{filtered.map(row=><article key={row.id} className="p-4 sm:px-5">
         <button onClick={()=>setExpanded(expanded===row.id?null:row.id)} className="flex w-full items-center gap-3 text-left">
           <span className={'grid h-10 w-10 shrink-0 place-items-center rounded-xl '+(row.action==='DELETE'?'bg-rose-50 text-rose-600 dark:bg-rose-950/40':row.action==='INSERT'?'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40':'bg-blue-50 text-blue-600 dark:bg-blue-950/40')}><Activity size={17}/></span>
           <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{titleCase(row.table_name)} · {actionLabel(row.action)}</span><span className="mt-1 block truncate text-xs text-slate-500">{tr('রেকর্ড','Record')}: {row.record_id || '—'} · {dateLabel(row.changed_at)}</span></span>
           <span className="hidden text-right text-[11px] text-slate-400 sm:block">{row.actor_id ? 'User '+row.actor_id.slice(0,8) : 'System'}</span>
           <span className="text-xs font-semibold text-blue-600">{expanded===row.id?'−': '+'}</span>
         </button>
         {expanded===row.id && <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2 dark:border-slate-800">
           <div className="rounded-xl bg-rose-50/70 p-3 dark:bg-rose-950/20"><h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">{tr('আগের তথ্য','Previous values')}</h4><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">{JSON.stringify(row.old_data || {},null,2)}</pre></div>
           <div className="rounded-xl bg-emerald-50/70 p-3 dark:bg-emerald-950/20"><h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{tr('নতুন তথ্য','New values')}</h4><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">{JSON.stringify(row.new_data || {},null,2)}</pre></div>
           <div className="md:col-span-2 text-[10px] text-slate-400">{tr('ব্যবহারকারী ID','Actor ID')}: {row.actor_id || 'System'} · {tr('অডিট ইভেন্ট ID','Audit event ID')}: {row.id}</div>
         </div>}
       </article>)}</div>}
    </section>
    <p className="text-xs leading-relaxed text-slate-400">{tr('এই লগ ডাটাবেস ট্রিগারের মাধ্যমে তৈরি হয়। অ্যাপ থেকে লগ পরিবর্তন বা মুছে ফেলার অনুমতি নেই।','Audit entries are generated by database triggers. The application has no permission to edit or delete these records.')}</p>
  </div>;
};
export default ActivityHistory;
