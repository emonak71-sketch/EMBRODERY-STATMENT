import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, Smartphone, X, AlertTriangle } from 'lucide-react';
import { APP_VERSION } from '../desktop/appVersion';
import { isAndroidTauriApp } from '../desktop/tauriBridge';

type AndroidRelease = {
  version: string;
  notes?: string;
  pub_date?: string;
  apk_url: string;
  sha256?: string;
  package_id?: string;
};

const compareVersions = (left:string,right:string) => {
  const a=left.split('.').map(Number),b=right.split('.').map(Number);
  for(let i=0;i<3;i++){
    const difference=(a[i]||0)-(b[i]||0);
    if(difference!==0)return difference;
  }
  return 0;
};

const AndroidUpdateBanner:React.FC = () => {
  const [release,setRelease]=useState<AndroidRelease|null>(null);
  const [checking,setChecking]=useState(false);
  const checkingRef=useRef(false);
  const [dismissed,setDismissed]=useState(false);
  const [error,setError]=useState('');

  const check=useCallback(async()=>{
    if(!isAndroidTauriApp()||checkingRef.current)return;
    checkingRef.current=true;
    setChecking(true);setError('');
    try{
      const response=await fetch('https://api.github.com/repos/emonak71-sketch/EMBRODERY-STATMENT/releases?per_page=20&check='+Date.now(),{
        cache:'no-store',
        headers:{Accept:'application/vnd.github+json'}
      });
      if(!response.ok)throw new Error('Update server returned HTTP '+response.status);
      const releases=await response.json() as Array<{tag_name:string;body?:string;draft:boolean;prerelease:boolean;assets:Array<{name:string;browser_download_url:string}>}>;
      const latest=releases.find(item=>!item.draft&&!item.prerelease&&/^v\d+\.\d+\.\d+$/.test(item.tag_name)&&item.assets.some(asset=>asset.name==='Embroidery-Statement-Android.apk'));
      if(!latest){setRelease(null);return;}
      const version=latest.tag_name.slice(1);
      const apk=latest.assets.find(asset=>asset.name==='Embroidery-Statement-Android.apk');
      if(!apk)throw new Error('The Android APK release asset is missing.');
      const data:AndroidRelease={version,apk_url:apk.browser_download_url,notes:(latest.body||'').slice(0,500),package_id:'com.embroidery.statement'};
      if(compareVersions(data.version,APP_VERSION)>0)setRelease(data);
      else setRelease(null);
    }catch(e:any){
      setError(e?.message||'Could not check Android updates.');
    }finally{checkingRef.current=false;setChecking(false);}
  },[]);

  useEffect(()=>{
    if(!isAndroidTauriApp())return;
    void check();
    const timer=window.setInterval(()=>void check(),6*60*60*1000);
    const onVisible=()=>{if(!document.hidden)void check();};
    document.addEventListener('visibilitychange',onVisible);
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);};
  },[check]);

  if(!isAndroidTauriApp())return null;
  if(!release&&!error)return null;
  if(dismissed&&release)return null;

  return <section className="mb-5 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-white p-4 shadow-sm dark:border-sky-900 dark:from-sky-950/50 dark:to-slate-900">
    {release?<div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200"><Smartphone size={20}/></div>
        <div className="min-w-0"><div className="text-xs font-black text-sky-900 dark:text-sky-100">Android update available · v{release.version}</div><p className="mt-1 text-[11px] leading-5 text-slate-600 dark:text-slate-300">{release.notes||'A newer version of Embroidery Statement is ready.'}</p><p className="mt-1 text-[10px] text-slate-500">After download, open the APK from Downloads and confirm installation. Your existing app data is retained when the same signing key is used.</p></div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a href={release.apk_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-[11px] font-black text-white hover:bg-sky-600"><Download size={14}/>Download APK</a>
        <button onClick={()=>setDismissed(true)} aria-label="Dismiss update notice" className="rounded-lg p-2 text-slate-400 hover:bg-sky-100 dark:hover:bg-slate-800"><X size={15}/></button>
      </div>
    </div>:<div className="flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-200"><AlertTriangle size={15}/><span>Android update check failed. It will retry automatically.</span><button onClick={()=>void check()} className="ml-auto inline-flex items-center gap-1 font-bold"><RefreshCw size={12}/>Retry</button></div>}
  </section>;
};
export default AndroidUpdateBanner;
