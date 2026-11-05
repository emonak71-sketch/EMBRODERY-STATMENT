import React, { useCallback, useEffect, useState } from 'react';
import { Bot, Headset, MessageCircle, Plus, Send, RefreshCw, Clock3, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

type Ticket={id:string;subject:string;category:string;priority:string;status:string;created_at:string;updated_at:string};
type Message={id:string;ticket_id:string;sender_id:string|null;sender_role:'customer'|'owner'|'assistant';body:string;created_at:string};
const statusLabel:Record<string,string>={open:'Open',in_progress:'Team notified',waiting_customer:'Waiting for you',resolved:'Resolved'};
const SupportCenter:React.FC<{userId:string;email:string}> = ({userId,email})=>{
  const [tickets,setTickets]=useState<Ticket[]>([]);
  const [active,setActive]=useState<Ticket|null>(null);
  const [messages,setMessages]=useState<Message[]>([]);
  const [subject,setSubject]=useState('');
  const [category,setCategory]=useState('general');
  const [firstMessage,setFirstMessage]=useState('');
  const [reply,setReply]=useState('');
  const [creating,setCreating]=useState(false);
  const [sending,setSending]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const loadTickets=useCallback(async()=>{
    const {data,error:loadError}=await supabase.from('support_tickets').select('id,subject,category,priority,status,created_at,updated_at').eq('user_id',userId).order('updated_at',{ascending:false}).limit(50);
    if(loadError)throw loadError;
    const rows=(data||[]) as Ticket[];
    setTickets(rows);
    if(active){const refreshed=rows.find(x=>x.id===active.id);if(refreshed)setActive(refreshed);}
    else if(rows[0])setActive(rows[0]);
  },[userId,active?.id]);
  const loadMessages=useCallback(async(ticketId:string)=>{
    const {data,error:loadError}=await supabase.from('support_messages').select('id,ticket_id,sender_id,sender_role,body,created_at').eq('ticket_id',ticketId).order('created_at',{ascending:true}).limit(100);
    if(loadError)throw loadError;
    setMessages((data||[]) as Message[]);
  },[]);
  useEffect(()=>{
    let alive=true;
    setLoading(true);setError('');
    void loadTickets().catch(e=>{if(alive)setError(e.message||'Could not load support requests.');}).finally(()=>{if(alive)setLoading(false);});
    const channel=supabase.channel('customer-support-'+userId)
      .on('postgres_changes',{event:'*',schema:'public',table:'support_tickets',filter:'user_id=eq.'+userId},()=>{void loadTickets().catch(()=>undefined);})
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'support_messages'},payload=>{
        const msg=payload.new as Message;
        if(active?.id===msg.ticket_id)void loadMessages(msg.ticket_id).catch(()=>undefined);
      }).subscribe();
    return()=>{alive=false;void supabase.removeChannel(channel);};
  },[userId,loadTickets,loadMessages,active?.id]);
  useEffect(()=>{if(active)void loadMessages(active.id).catch(e=>setError(e.message||'Could not load conversation.'));else setMessages([]);},[active?.id,loadMessages]);

  const sendToAssistant=async(ticketId:string,body:string)=>{
    const {error:invokeError}=await supabase.functions.invoke('support-assistant',{body:{ticket_id:ticketId,message:body}});
    if(invokeError){
      const {data:existing}=await supabase.from('support_messages').select('id').eq('ticket_id',ticketId).eq('sender_role','customer').eq('body',body).limit(1);
      if(!existing?.length){
        const {error:insertError}=await supabase.from('support_messages').insert({ticket_id:ticketId,sender_id:userId,sender_role:'customer',body});
        if(insertError)throw insertError;
      }
      setNotice('Your report was saved. The support team has been notified; AI assistance is temporarily unavailable.');
    }
    await Promise.all([loadMessages(ticketId),loadTickets()]);
  };

  const createTicket=async(event:React.FormEvent)=>{
    event.preventDefault();if(creating)return;
    const cleanSubject=subject.trim(),cleanMessage=firstMessage.trim();
    if(cleanSubject.length<3||cleanMessage.length<3){setError('Please enter a subject and describe the issue.');return;}
    setCreating(true);setError('');setNotice('');
    try{
      const {data,error:createError}=await supabase.from('support_tickets').insert({user_id:userId,subject:cleanSubject,category,priority:'normal'}).select('id,subject,category,priority,status,created_at,updated_at').single();
      if(createError||!data)throw createError||new Error('Could not create support request.');
      const ticket=data as Ticket;setTickets(current=>[ticket,...current]);setActive(ticket);
      await sendToAssistant(ticket.id,cleanMessage);
      setSubject('');setFirstMessage('');
    }catch(e:any){setError(e.message||'Could not submit your report.');}
    finally{setCreating(false);}
  };
  const sendReply=async(event:React.FormEvent)=>{
    event.preventDefault();if(!active||sending||!reply.trim())return;
    setSending(true);setError('');setNotice('');
    const body=reply.trim();setReply('');
    try{await sendToAssistant(active.id,body);}
    catch(e:any){setReply(body);setError(e.message||'Message could not be sent.');}
    finally{setSending(false);}
  };

  return <div className="mx-auto max-w-6xl space-y-5 pb-8">
    <div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-sky-700"><Bot size={13}/> AI + Human Support</div><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Help & Support</h1><p className="mt-1 text-sm text-slate-500">Ask the assistant or report a problem. If it cannot solve the issue, a support ticket is sent to the team.</p></div>
    {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
    {notice&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</div>}
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between"><div className="text-sm font-black">Your requests</div><button onClick={()=>{setActive(null);setMessages([]);}} className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-2 text-[10px] font-black text-white"><Plus size={13}/>New report</button></div>
        {loading?<div className="py-8 text-center text-xs text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin"/>Loading…</div>:tickets.length===0?<div className="py-8 text-center text-xs leading-5 text-slate-500">No support requests yet. Start a new report if you need help.</div>:tickets.map(ticket=><button key={ticket.id} onClick={()=>setActive(ticket)} className={'w-full rounded-xl border p-3 text-left transition '+(active?.id===ticket.id?'border-sky-400 bg-sky-50 dark:bg-sky-950/30':'border-slate-100 hover:border-slate-300 dark:border-slate-800')}>
          <div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-black">{ticket.subject}</span><span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600 dark:bg-slate-800">{statusLabel[ticket.status]||ticket.status}</span></div><div className="mt-2 text-[10px] text-slate-400">{new Date(ticket.updated_at).toLocaleString()}</div>
        </button>)}
      </section>
      <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {!active?<form onSubmit={createTicket} className="m-auto w-full max-w-xl space-y-4 p-5 sm:p-8">
          <div className="mb-5 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-950"><Headset size={23}/></div><div><div className="text-lg font-black">Report a problem</div><div className="text-xs text-slate-500">Your account: {email}</div></div></div>
          <label className="block text-xs font-bold">Subject<input required minLength={3} maxLength={140} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Attendance is not saving" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"/></label>
          <label className="block text-xs font-bold">Category<select value={category} onChange={e=>setCategory(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="general">General</option><option value="account">Account & Login</option><option value="subscription">Subscription</option><option value="attendance">Attendance</option><option value="payroll">Worker & Payroll</option><option value="data">Data & Reports</option><option value="bug">App Error / Bug</option><option value="other">Other</option></select></label>
          <label className="block text-xs font-bold">Describe your issue<textarea required minLength={3} maxLength={6000} rows={5} value={firstMessage} onChange={e=>setFirstMessage(e.target.value)} placeholder="Tell us what happened and what you expected…" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"/></label>
          <button disabled={creating} className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-3.5 text-xs font-black text-white disabled:opacity-50">{creating?<Loader2 size={15} className="animate-spin"/>:<Send size={15}/>}Send to AI Assistant</button>
        </form>:<>
          <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800"><div className="min-w-0"><div className="truncate text-sm font-black">{active.subject}</div><div className="mt-1 text-[10px] text-slate-500">Ticket {active.id.slice(0,8)} · {statusLabel[active.status]||active.status}</div></div><button onClick={()=>void loadMessages(active.id)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><RefreshCw size={15}/></button></div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 dark:bg-slate-950/30">
            {!messages.length?<div className="py-10 text-center text-xs text-slate-500">Starting your support conversation…</div>:messages.map(message=><div key={message.id} className={'flex '+(message.sender_role==='customer'?'justify-end':'justify-start')}><div className={'max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-6 '+(message.sender_role==='customer'?'bg-sky-700 text-white':'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200')}><div className="mb-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider opacity-70">{message.sender_role==='customer'?'You':message.sender_role==='owner'?'Support Team':'AI Assistant'}{message.sender_role==='assistant'&&<Bot size={11}/>}</div><div className="whitespace-pre-wrap">{message.body}</div><div className="mt-1 text-right text-[9px] opacity-60">{new Date(message.created_at).toLocaleString()}</div></div></div>)}
          </div>
          {active.status==='resolved'?<div className="flex items-center gap-2 border-t border-slate-100 p-4 text-xs font-semibold text-emerald-700 dark:border-slate-800"><CheckCircle2 size={16}/>This issue is marked resolved. Create a new report if you need further help.</div>:<form onSubmit={sendReply} className="flex items-end gap-2 border-t border-slate-100 p-3 dark:border-slate-800"><textarea value={reply} onChange={e=>setReply(e.target.value)} rows={2} maxLength={6000} placeholder="Write another message…" className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-800"/><button disabled={sending||!reply.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-700 text-white disabled:opacity-40">{sending?<Loader2 size={16} className="animate-spin"/>:<Send size={16}/>}</button></form>}
        </>}
      </section>
    </div>
    <div className="flex items-start gap-2 text-[10px] leading-5 text-slate-400"><AlertCircle size={13} className="mt-0.5 shrink-0"/>Never send your password, Nagad PIN or OTP in a support message. The team will only need your account email and a description of the problem.</div>
  </div>;
};
export default SupportCenter;
