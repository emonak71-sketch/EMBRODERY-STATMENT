import React, { useCallback, useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { accountToolsService } from '../services/accountToolsService';
import { desktopInvoke, isTauriApp } from '../desktop/tauriBridge';

type Notice = {id:string;notification_type:string;title:string;body:string;payload:Record<string,unknown>;created_at:string;read_at:string|null};
const NotificationCenter:React.FC<{userId:string}> = ({userId}) => {
  const [items,setItems]=useState<Notice[]>([]);
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const load=useCallback(async()=>{
    const {data,error}=await supabase.from('app_notifications').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(30);
    if(!error)setItems((data||[]) as Notice[]);
  },[userId]);
  useEffect(()=>{
    const refresh=async()=>{try{await accountToolsService.syncReviews();}catch(e){console.warn('Salary review reminders unavailable',e);}await load();};
    void refresh();
    const timer=window.setInterval(()=>void refresh(),60*60*1000);
    const visible=()=>{if(!document.hidden)void refresh();};
    document.addEventListener('visibilitychange',visible);
    const channel=supabase.channel('app-notifications-'+userId)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'app_notifications',filter:'user_id=eq.'+userId},payload=>{
        const notice=payload.new as Notice;
        setItems(current=>[notice,...current].slice(0,30));
        if(isTauriApp()){
          void desktopInvoke('desktop_notify_message',{title:notice.title,body:notice.body}).catch(()=>undefined);
        }else if(typeof Notification!=='undefined'&&Notification.permission==='granted'){
          try{new Notification(notice.title,{body:notice.body,icon:'/embroidery-statement-logo-180.png'});}catch{}
        }
      }).subscribe();
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);void supabase.removeChannel(channel);};
  },[load,userId]);
  const markRead=async(id:string)=>{
    const {error}=await supabase.from('app_notifications').update({read_at:new Date().toISOString()}).eq('id',id).eq('user_id',userId);
    if(!error)setItems(current=>current.map(item=>item.id===id?{...item,read_at:new Date().toISOString()}:item));
  };
  const markAll=async()=>{
    setBusy(true);
    const ids=items.filter(x=>!x.read_at).map(x=>x.id);
    if(ids.length){
      const {error}=await supabase.from('app_notifications').update({read_at:new Date().toISOString()}).in('id',ids).eq('user_id',userId);
      if(!error)setItems(current=>current.map(x=>({...x,read_at:x.read_at||new Date().toISOString()})));
    }
    setBusy(false);
  };
  const enable=async()=>{
    if(isTauriApp()){
      try{
        const native=window.__TAURI__?.notification;
        if(!native)throw new Error('Native notification permission API is unavailable.');
        let granted=await native.isPermissionGranted();
        if(!granted)granted=(await native.requestPermission())==='granted';
        if(granted){
          await desktopInvoke('desktop_notify_message',{
            title:'Embroidery Statement',
            body:'Notifications are enabled on this device.',
          });
        }
      }catch(error){console.warn('Could not enable native notifications:',error);}
      return;
    }
    if(typeof Notification==='undefined')return;
    try{await Notification.requestPermission();}catch{}
  };
  const unread=items.filter(x=>!x.read_at).length;
  return <div className="relative">
    <button type="button" onClick={()=>{setOpen(v=>!v);void load();}} aria-label="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><Bell size={17}/>{unread>0&&<span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-600 px-1 text-[9px] font-black leading-5 text-white">{unread>9?'9+':unread}</span>}</button>
    {open&&<div className="fixed inset-x-3 top-[68px] z-[100] max-h-[75vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[370px]">
      <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800"><div><div className="text-sm font-black">Notifications</div><div className="text-[10px] text-slate-500">{unread} unread</div></div><div className="flex items-center gap-1"><button onClick={enable} title="Enable device notifications" className="rounded-lg px-2 py-1 text-[10px] font-bold text-sky-700 hover:bg-sky-50">Enable</button><button disabled={busy||unread===0} onClick={()=>void markAll()} title="Mark all read" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><CheckCheck size={15}/></button><button onClick={()=>setOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={15}/></button></div></div>
      <div className="max-h-[60vh] overflow-y-auto">
        {!items.length?<div className="p-8 text-center text-xs text-slate-500">No notifications yet.</div>:items.map(item=><button key={item.id} onClick={()=>void markRead(item.id)} className={'block w-full border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 '+(!item.read_at?'bg-sky-50/70 dark:bg-sky-950/20':'')}>
          <div className="flex items-start gap-3"><span className={'mt-1 h-2 w-2 shrink-0 rounded-full '+(!item.read_at?'bg-sky-500':'bg-slate-300')}/><span className="min-w-0 flex-1"><span className="block text-xs font-black">{item.title}</span><span className="mt-1 block text-[11px] leading-5 text-slate-600 dark:text-slate-300">{item.body}</span><span className="mt-2 block text-[9px] text-slate-400">{new Date(item.created_at).toLocaleString()}</span></span>{item.read_at&&<Check size={13} className="text-emerald-600"/>}</div>
        </button>)}
      </div>
    </div>}
  </div>;
};
export default NotificationCenter;
