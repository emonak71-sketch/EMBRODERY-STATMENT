import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, Globe, Monitor, Smartphone, ShieldCheck, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Device = { name: string; recommended: 'web' | 'windows' | 'android'; apple?: 'ios' | 'mac' };
export function detectDevice(ua: string, platform: string, touchPoints: number): Device {
 if (/Android/i.test(ua)) return { name: 'Android', recommended: 'android' };
 if (/iPhone|iPad|iPod/i.test(ua) || (/Mac/i.test(platform) && touchPoints > 1)) return { name: /iPhone/i.test(ua) ? 'iPhone' : 'iPad', recommended: 'web', apple: 'ios' };
 if (/Windows NT 10\.0|Windows NT 11\.0/i.test(ua)) return { name: 'Windows 10/11', recommended: 'windows' };
 if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return { name: 'Mac', recommended: 'web', apple: 'mac' };
 return { name: 'your device', recommended: 'web' };
}

type Asset={name:string;browser_download_url:string;size:number};
type Release={tag_name:string;body?:string;draft:boolean;prerelease:boolean;assets:Asset[]};
type DownloadItem={version:string;url:string;size:number;notes:string};

const API='https://api.github.com/repos/emonak71-sketch/EMBRODERY-STATMENT/releases?per_page=30';
const DownloadPortal:React.FC=()=>{
 const [device] = useState(() => detectDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints));
 const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
 const [installing, setInstalling] = useState(false);
 const [installError, setInstallError] = useState('');
 useEffect(() => {
  const ready = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
  const installed = () => setInstallPrompt(null);
  window.addEventListener('beforeinstallprompt', ready);
  window.addEventListener('appinstalled', installed);
  return () => { window.removeEventListener('beforeinstallprompt', ready); window.removeEventListener('appinstalled', installed); };
 }, []);
 const install = async () => {
  if (!installPrompt || installing) return;
  setInstalling(true); setInstallError('');
  try { await installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null); }
  catch { setInstallError('Installation could not start. Open the Web App and use your browser install menu.'); }
  finally { setInstalling(false); }
 };
 const recommended = (kind: Device['recommended']) => device.recommended === kind ? <span className="mb-3 inline-block self-start rounded-full bg-sky-400/20 px-3 py-1 text-[10px] font-bold text-sky-100">Recommended for this device</span> : null;
 const [android,setAndroid]=useState<DownloadItem|null>(null);
 const [windows,setWindows]=useState<DownloadItem|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');

 const load=async()=>{
  setLoading(true);setError('');setAndroid(null);setWindows(null);
  try{
   const response=await fetch(API,{signal:AbortSignal.timeout(15000),cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
   if(!response.ok)throw new Error('Download server returned HTTP '+response.status);
   const releases=await response.json() as Release[];
   const androidRelease=releases.find(r=>!r.draft&&!r.prerelease&&/^android-v\d+\.\d+\.\d+$/.test(r.tag_name)&&r.assets.some(a=>a.name==='Embroidery-Statement-Android.apk'));
   const androidAsset=androidRelease?.assets.find(a=>a.name==='Embroidery-Statement-Android.apk');
   if(androidRelease&&androidAsset)setAndroid({version:androidRelease.tag_name.slice('android-v'.length),url:androidAsset.browser_download_url,size:androidAsset.size,notes:(androidRelease.body||'').slice(0,300)});

   const windowsRelease=releases.find(r=>!r.draft&&!r.prerelease&&/^v\d+\.\d+\.\d+$/.test(r.tag_name)&&r.assets.some(a=>a.name.toLowerCase().endsWith('.exe')&&!a.name.toLowerCase().includes('owner')&&!a.name.toLowerCase().includes('uninstall')));
   const windowsAsset=windowsRelease?.assets.find(a=>a.name.toLowerCase().endsWith('.exe')&&!a.name.toLowerCase().includes('owner')&&!a.name.toLowerCase().includes('uninstall'));
   if(windowsRelease&&windowsAsset)setWindows({version:windowsRelease.tag_name.slice(1),url:windowsAsset.browser_download_url,size:windowsAsset.size,notes:(windowsRelease.body||'').slice(0,300)});
  }catch(e:any){setError(e?.message||'Could not load the latest app downloads.');}
  finally{setLoading(false);}
 };
 useEffect(()=>{void load();},[]);

 const size=(bytes:number)=>bytes<1024*1024?Math.max(1,Math.round(bytes/1024))+' KB':(bytes/1024/1024).toFixed(1)+' MB';
 return <main className="min-h-screen bg-[#071a35] px-4 py-10 text-white sm:px-6">
  <div className="pointer-events-none fixed inset-0 opacity-30" style={{background:'radial-gradient(circle at 12% 12%, #0b8fe5 0, transparent 34%), radial-gradient(circle at 90% 85%, #0d9488 0, transparent 32%)'}}/>
  <div className="relative mx-auto max-w-5xl">
   <a href="/" className="inline-flex items-center gap-2 text-xs font-bold text-sky-200 hover:text-white"><ArrowLeft size={15}/>Back to Web App</a>
   <header className="mb-9 mt-8 text-center">
    <img src="/embroidery-statement-mark.svg" alt="Embroidery Statement" className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-white p-2"/>
    <div className="text-[10px] font-black uppercase tracking-[.28em] text-sky-300">Official Downloads</div>
    <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Embroidery Statement</h1>
    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">Choose the app that matches your device. All customer apps use the same account and cloud data.</p>
   </header>
   <p className="mb-5 text-center text-sm text-sky-200">We detected {device.name}. All download options remain available.</p>
   {error&&<div role="alert" className="mb-5 flex items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-500/10 p-3 text-xs text-rose-100"><AlertCircle size={15}/>{error}<button onClick={()=>void load()} className="ml-auto font-bold underline">Retry</button></div>}
   {loading&&<div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-300"><RefreshCw className="animate-spin" size={17}/>Checking latest releases…</div>}<div className="grid gap-4 md:grid-cols-3">
    <section className="flex flex-col rounded-3xl border border-white/10 bg-white/[.06] p-6 shadow-2xl backdrop-blur-xl">
     <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-200"><Globe size={24}/></div>
     {recommended('web')}<div className="text-lg font-black">Web App / PWA</div>
     <p className="mt-2 flex-1 text-xs leading-6 text-slate-300">Use the app in your browser or install it on your phone's home screen. Updates arrive automatically.</p>
     <a href="/" className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300/30 bg-sky-500/15 px-4 py-3 text-xs font-black text-sky-100 hover:bg-sky-500/25">Open Web App <ExternalLink size={14}/></a>
     {installPrompt&&<button onClick={()=>void install()} disabled={installing} className="mt-3 rounded-xl bg-sky-600 px-4 py-3 text-xs font-bold disabled:opacity-50">{installing?'Opening install prompt…':'Install on this device'}</button>}
     {installError&&<p role="alert" className="mt-3 text-xs text-rose-200">{installError}</p>}
     <div className="mt-3 text-[10px] leading-5 text-slate-300">{device.apple==='mac' ? 'Mac: Open the Web App in Safari → File → Add to Dock (macOS Sonoma or later).' : device.apple==='ios' ? 'iPhone / iPad: Open the Web App in Safari → Share → Add to Home Screen → Add.' : 'To install the PWA, open the Web App and use your browser’s Install app menu when available.'}</div>
     {device.apple&&<p className="mt-2 text-[10px] leading-5 text-slate-400">Use the Web App on Apple devices. The EXE and APK downloads are for Windows and Android.</p>}
    </section>
    <section className="flex flex-col rounded-3xl border border-white/10 bg-white/[.06] p-6 shadow-2xl backdrop-blur-xl">
     <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-200"><Monitor size={24}/></div>
     {recommended('windows')}<div className="text-lg font-black">Windows EXE</div>
     <p className="mt-2 flex-1 text-xs leading-6 text-slate-300">Install the customer desktop app. Updates are verified with the existing signing key. Manage installation in Settings.</p>
     {windows?<><a href={windows.url} className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white hover:bg-emerald-500"><Download size={15}/>Download EXE</a><div className="mt-3 flex justify-between text-[10px] text-slate-400"><span>Version {windows.version}</span><span>{size(windows.size)}</span></div></>:<div className="mt-6 rounded-xl border border-white/10 p-3 text-center text-xs text-slate-400">Latest signed Windows installer is not published yet.</div>}
    </section>
    <section className="flex flex-col rounded-3xl border border-white/10 bg-white/[.06] p-6 shadow-2xl backdrop-blur-xl">
     <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-400/15 text-violet-200"><Smartphone size={24}/></div>
     {recommended('android')}<div className="text-lg font-black">Android APK</div>
     <p className="mt-2 flex-1 text-xs leading-6 text-slate-300">Install the customer app directly. No Google Play Store is used. Android asks you to confirm each APK update.</p>
     {android?<><a href={android.url} className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-xs font-black text-white hover:bg-violet-500"><Download size={15}/>Download APK</a><div className="mt-3 flex justify-between text-[10px] text-slate-400"><span>Version {android.version}</span><span>{size(android.size)}</span></div><div className="mt-3 text-[10px] leading-5 text-slate-400">After download, open the APK and approve installation. Future updates use the same signing certificate.</div></>:<div className="mt-6 rounded-xl border border-white/10 p-3 text-center text-xs text-slate-400">Signed Android APK will appear here after the first release.</div>}
    </section>
   </div>
   <div className="mt-8 flex items-start justify-center gap-2 text-center text-[10px] leading-5 text-slate-400"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-300"/>Download only from this official page. Your account and business records remain in the shared cloud database.</div>
   <footer className="mt-8 text-center text-[10px] text-slate-500">© Embroidery Statement · Official customer app downloads</footer>
  </div>
 </main>;
};
export default DownloadPortal;
