import React, {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowDownToLine, CheckCircle2, Clock3, LoaderCircle, ShieldCheck, X} from 'lucide-react';
import {desktopInvoke, desktopListen, isWindowsDesktop} from './tauriBridge';

type DesktopUpdateInfo = {
  current_version:string;
  available_version:string|null;
  notes:string|null;
  portable:boolean;
  configured:boolean;
};
type Audience = 'customer'|'owner';

function getVisibleReleaseNotes(notes:string|null, audience:Audience):string[] {
  const lines=(notes || 'Performance improvements and bug fixes.').split(/\r?\n/);
  const hasAudienceSections=lines.some(line=>{
    const heading=line.match(/^##\s+(.+)$/);
    return heading && heading[1].toLowerCase().includes(audience);
  });
  if(!hasAudienceSections) return lines.filter(line=>line.trim());
  let section='common';
  return lines.filter(line=>{
    const heading=line.match(/^##\s+(.+)$/);
    if(heading){
      const value=heading[1].toLowerCase();
      section=value.includes('customer')?'customer':value.includes('owner')?'owner':'common';
    }
    return (section==='common'||section===audience) && Boolean(line.trim());
  });
}

const DesktopUpdatePrompt:React.FC<{audience:Audience}>=({audience})=>{
  const [info,setInfo]=useState<DesktopUpdateInfo|null>(null);
  const [installing,setInstalling]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    if(!isWindowsDesktop()) return;
    let active=true;
    let checking=false;
    let unlisten:(()=>void)|undefined;
    const checkForUpdate=async()=>{
      if(!active||checking) return;
      checking=true;
      try{
        const next=await desktopInvoke<DesktopUpdateInfo>('desktop_check_update');
        if(!active) return;
        if(next.available_version && !next.portable && next.configured){
          setInfo(next);
          setError('');
        }else setInfo(null);
      }catch(reason){
        if(active) console.warn('Could not check for a signed application update.',reason);
      }finally{checking=false;}
    };
    const onOpen=()=>{void checkForUpdate();};
    const manualEvent=audience==='owner'?'embroidery:owner-open-updates':'embroidery:check-updates';
    window.addEventListener(manualEvent,onOpen);
    void checkForUpdate();
    void desktopListen('desktop:app-opened',onOpen).then(stop=>{
      if(active) unlisten=stop; else stop();
    }).catch(reason=>console.warn('Could not subscribe to application-open events.',reason));
    return()=>{
      active=false;
      window.removeEventListener(manualEvent,onOpen);
      unlisten?.();
    };
  },[audience]);

  const closePrompt=()=>{setInfo(null);setError('');};
  const installUpdate=async()=>{
    if(!info?.available_version||installing)return;
    setInstalling(true);setError('');
    try{await desktopInvoke('desktop_install_update');}
    catch(reason){
      setError('The update could not be installed. Please check your internet connection and try again. '+String(reason));
      setInstalling(false);
    }
  };

  if(!info?.available_version || typeof document==='undefined') return null;
  const releaseLines=getVisibleReleaseNotes(info.notes,audience);
  const appName=audience==='owner'?'Owner Control Center':'Embroidery Statement';
  return createPortal(
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)closePrompt();}}>
      <section role="dialog" aria-modal="true" aria-labelledby="desktop-update-title" className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-slate-700 bg-slate-950 text-white shadow-2xl">
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-blue-500 to-emerald-400"/>
        <header className="flex items-start gap-4 px-6 pb-4 pt-6 sm:px-8">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-sky-400/25 bg-sky-400/10 text-sky-300"><ArrowDownToLine size={27}/></div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-sky-300">{appName}</p>
            <h2 id="desktop-update-title" className="mt-1 text-2xl font-black tracking-tight">A new update is available</h2>
            <p className="mt-1 text-sm text-slate-400">Review what changed, then update whenever you are ready.</p>
          </div>
          <button type="button" onClick={closePrompt} aria-label="Close update popup" className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"><X size={20}/></button>
        </header>
        <div className="px-6 sm:px-8">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Current version</p>
              <p className="mt-1 text-lg font-black text-slate-200">v{info.current_version}</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">New version</p>
              <p className="mt-1 text-lg font-black text-emerald-300">v{info.available_version}</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="mb-3 flex items-center gap-2"><CheckCircle2 size={17} className="text-emerald-400"/><h3 className="text-sm font-black">What’s new in this update</h3></div>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-2 text-sm leading-6 text-slate-300">
              {releaseLines.map((line,index)=>{
                const value=line.trim();
                if(value.startsWith('#')) return <h4 key={index} className="pt-2 text-xs font-black uppercase tracking-wider text-sky-300">{value.replace(/^#+\s*/,'')}</h4>;
                if(/^[-*]\s+/.test(value)) return <div key={index} className="flex gap-2"><span className="mt-0.5 text-emerald-400">•</span><p>{value.replace(/^[-*]\s+/,'')}</p></div>;
                return <p key={index}>{value}</p>;
              })}
            </div>
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-slate-400"><ShieldCheck size={15} className="shrink-0 text-emerald-400"/>You can choose Later. This reminder will appear again the next time you open the app until the update is installed.</p>
          {error && <p role="alert" className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs leading-5 text-rose-200">{error}</p>}
        </div>
        <footer className="mt-5 flex flex-col-reverse gap-3 border-t border-slate-800 bg-slate-900/70 px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
          <button type="button" onClick={closePrompt} disabled={installing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"><Clock3 size={16}/>Later</button>
          <button type="button" onClick={()=>void installUpdate()} disabled={installing} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60">
            {installing?<><LoaderCircle size={17} className="animate-spin"/>Installing update…</>:<><ArrowDownToLine size={17}/>Update Now</>}
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
};
export default DesktopUpdatePrompt;
