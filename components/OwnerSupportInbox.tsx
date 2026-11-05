import React, { useCallback, useEffect, useState } from 'react';
import { Headset, RefreshCw, Send, Loader2, CheckCircle2, Clock3, UserRound, Bot, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

type Message={id:string;ticket_id:string;sender_id:string|null;sender_role:'customer'|'owner'|'assistant';body:string;created_at:string};
type Ticket={id:string;user_id:string;customer_email:string|null;business_name:string|null;subject:string;category:string;priority:string;status:string;created_at:string;updated_at:string;support_messages:Message[]};
const statusOptions=['open','in_progress','waiting_customer','resolved'];
const OwnerSupportInbox:React.FC<{userId:string}> = ({userId})=>{
 const [tickets,setTickets]=useState<Ticket[]>([]);
 const [selected,setSelected]=useState<Ticket|null>(null);
 const [reply,setReply]=useState('');
 const [loading,setLoading]=useState(true);
 const [sending,setSending]=useState(false);
 const [error,setError]=useState('');
 const [filter,setFilter]=useState('all');
 const load=useCallback(async()=>{
  const {data,error:loadError}=await supabase.from('support_tickets').select('*, support_messages(*)').order('updated_at',{ascending:false}).limit(100);
  if(loadError)throw loadError;
  const rows=((data||[]) as Ticket[]).map(ticket=>({...ticket,support_messages:[...(ticket.support_messages||[])].sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime())}));
  setTickets(rows);
  if(selected){const next=rows.find(x=>x.id===selected.id);if(next)setSelected(next);else setSelected(null);}
  else if(rows[0])setSelected(rows[0]);
 },[selected?.id]);
 useEffect(()=>{
  let alive=true;setLoading(true);
  void load().catch(e=>{if(alive)setError(e.message||'Could not load support inbox.');}).finally(()=>{if(alive)setLoading(false);});
  const channel=supabase.channel('owner-support-inbox')
   .on('postgres_changes',{event:'*',schema:'public',table:'support_tickets'},()=>{void load().catch(()=>undefined);})
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'support_messages'},()=>{void load().catch(()=>undefined);})
   .subscribe();
  return()=>{alive=false;void supabase.removeChannel(channel);};
 },[load]);
 const sendReply=async(event:React.FormEvent)=>{
  event.preventDefault();if(!selected||sending||!reply.trim())return;
  setSending(true);setError('');
  const body=reply.trim();setReply('');
  try{
   const {error:insertError}=await supabase.from('support_messages').insert({ticket_id:selected.id,sender_id:userId,sender_role:'owner',body});
   if(insertError)throw insertError;
   const {error:updateError}=await supabase.from('support_tickets').update({status:'in_progress'}).eq('id',selected.id);
   if(updateError)throw updateError;
   await load();
  }catch(e:any){setReply(body);setError(e.message||'Reply could not be sent.');}
  finally{setSending(false);}
 };
 const updateStatus=async(status:string)=>{
  if(!selected)return;setError('');
  const {error:updateError}=await supabase.from('support_tickets').update({status,resolved_at:status==='resolved'?new Date().toISOString():null}).eq('id',selected.id);
  if(updateError){setError(updateError.message);return;}
  await load();
 };
 const visible=tickets.filter(t=>filter==='all'||t.status===filter);
 const messages=selected?.support_messages||[];
 return <div className="space-y-5">
  <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-emerald-700"><Headset size={13}/> Customer care</div><h1 className="text-2xl font-black sm:text-3xl">Support Inbox</h1><p className="mt-1 text-sm text-slate-500">Review customer reports, inspect AI responses and reply from the Owner account.</p></div><button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-900"><RefreshCw size={14}/>Refresh</button></div>
  {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
  <div className="flex flex-wrap gap-2">{['all',...statusOptions].map(s=><button key={s} onClick={()=>setFilter(s)} className={'rounded-full px-3 py-2 text-[10px] font-black capitalize '+(filter===s?'bg-slate-900 text-white dark:bg-sky-700':'border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')}>{s==='all'?'All tickets':s.replace('_',' ')}</button>)}</div>
  <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
   <section className="max-h-[760px] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
    {loading?<div className="py-12 text-center text-xs text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin"/>Loading tickets…</div>:visible.length===0?<div className="py-12 text-center text-xs text-slate-500">No tickets in this filter.</div>:visible.map(ticket=><button key={ticket.id} onClick={()=>setSelected(ticket)} className={'w-full rounded-xl border p-3 text-left '+(selected?.id===ticket.id?'border-sky-400 bg-sky-50 dark:bg-sky-950/30':'border-slate-100 hover:border-slate-300 dark:border-slate-800')}>
     <div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-black">{ticket.subject}</span><span className={'rounded-full px-2 py-1 text-[9px] font-bold '+(ticket.status==='resolved'?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-800')}>{ticket.status.replace('_',' ')}</span></div>
     <div className="mt-2 truncate text-[10px] font-semibold text-slate-500">{ticket.business_name||'Customer'} · {ticket.customer_email||ticket.user_id}</div>
     <div className="mt-2 flex items-center justify-between text-[9px] text-slate-400"><span>{ticket.category} · {ticket.priority}</span><span>{new Date(ticket.updated_at).toLocaleDateString()}</span></div>
    </button>)}
   </section>
   <section className="flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
    {!selected?<div className="m-auto p-8 text-center text-sm text-slate-500">Select a support ticket to view the conversation.</div>:<>
     <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800"><div className="min-w-0"><h2 className="truncate text-sm font-black">{selected.subject}</h2><div className="mt-1 truncate text-[10px] text-slate-500">{selected.customer_email||selected.user_id} · {selected.business_name||'Customer'} · {selected.id.slice(0,8)}</div></div><select value={selected.status} onChange={e=>void updateStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold dark:border-slate-700 dark:bg-slate-800">{statusOptions.map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></div>
     <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 dark:bg-slate-950/30">
      {!messages.length?<div className="py-10 text-center text-xs text-slate-500">No messages in this ticket.</div>:messages.map(message=><div key={message.id} className={'flex '+(message.sender_role==='owner'?'justify-end':'justify-start')}><div className={'max-w-[90%] rounded-2xl px-4 py-3 text-xs leading-6 '+(message.sender_role==='owner'?'bg-sky-700 text-white':'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200')}><div className="mb-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider opacity-70">{message.sender_role==='owner'?<><UserRound size={11}/> You / Owner</>:message.sender_role==='assistant'?<><Bot size={11}/> AI Assistant</>:<><UserRound size={11}/> Customer</>}</div><div className="whitespace-pre-wrap">{message.body}</div><div className="mt-1 text-right text-[9px] opacity-60">{new Date(message.created_at).toLocaleString()}</div></div></div>)}
     </div>
     <form onSubmit={sendReply} className="flex items-end gap-2 border-t border-slate-100 p-3 dark:border-slate-800"><textarea value={reply} onChange={e=>setReply(e.target.value)} rows={2} maxLength={6000} placeholder="Reply to customer…" className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-800"/><button disabled={sending||!reply.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-700 text-white disabled:opacity-40">{sending?<Loader2 size={16} className="animate-spin"/>:<Send size={16}/>}</button></form>
    </>}
   </section>
  </div>
  <div className="flex items-start gap-2 text-[10px] leading-5 text-slate-400"><AlertTriangle size={13} className="mt-0.5 shrink-0"/>Do not ask customers to send passwords, Nagad PINs or OTPs. Ask only for non-sensitive diagnostic details.</div>
 </div>;
};
export default OwnerSupportInbox;
