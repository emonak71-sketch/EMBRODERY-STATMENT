import React, { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, Settings, ShieldCheck } from 'lucide-react';
import { desktopInvoke, isWindowsDesktop } from '../desktop/tauriBridge';
import { APP_VERSION } from '../desktop/appVersion';
import type { DesktopUpdateInfo } from './DesktopSettings';

export default function OwnerUpdateSettings() {
  const desktop = isWindowsDesktop();
  const [info, setInfo] = useState<DesktopUpdateInfo | null>(null);
  const [action, setAction] = useState<'loading'|'checking'|'installing'|null>(desktop ? 'loading' : null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lastCheck, setLastCheck] = useState(() => localStorage.getItem('owner_last_update_check') || '');
  const busy = useRef(false);
  useEffect(() => {
    if (!desktop) return;
    let active = true;
    desktopInvoke<DesktopUpdateInfo>('desktop_info').then(value => {
      if (active) setInfo(value);
    }).catch(e => { if (active) setError('Could not read application version: ' + String(e)); })
      .finally(() => { if (active) setAction(null); });
    return () => { active = false; };
  }, [desktop]);

  const checkUpdates = async () => {
    if (busy.current || action) return;
    busy.current = true;
    setAction('checking'); setError(''); setMessage('Checking for updates…');
    try {
      const next = await desktopInvoke<DesktopUpdateInfo>('desktop_check_update');
      setInfo(next);
      const checked = new Date().toLocaleString();
      setLastCheck(checked);
      localStorage.setItem('owner_last_update_check', checked);
      setMessage(next.portable ? 'Portable edition requires installing the latest Owner setup manually.'
        : !next.configured ? 'Updates are unavailable for this installation. Install the official Owner setup.'
        : next.available_version ? 'An update is available. Click Update Now to install it.' : 'You are using the latest version.');
    } catch (e) {
      setInfo(current => current ? {...current, available_version: null, notes: null} : current);
      setMessage(''); setError('Could not check for updates. Check your internet connection and try again. ' + String(e));
    } finally { busy.current = false; setAction(null); }
  };

  const installUpdate = async () => {
    if (busy.current || action || !info?.available_version || !info.configured || info.portable) return;
    busy.current = true;
    setAction('installing'); setError(''); setMessage('Downloading and installing update… The app will restart.');
    try { await desktopInvoke('desktop_install_update'); }
    catch (e) { setMessage(''); setError('Update failed. Please try again. ' + String(e)); }
    finally { busy.current = false; setAction(null); }
  };

  return <section className="space-y-5">
    <div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-sky-600"><Settings size={16}/>Settings</div>
      <h1 className="mt-2 text-2xl font-black">Owner Application Settings</h1></div>
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="flex items-center gap-2 text-base font-black"><ShieldCheck size={18} className="text-sky-600"/>Application Updates</h2>
      <p className="mt-2 text-sm text-slate-500">Current version: <strong>{info?.current_version || APP_VERSION}</strong></p>
      {!desktop ? <p className="mt-4 text-sm text-slate-500">Open Settings in the Owner Windows application to check for and install EXE updates.</p> : <>
        <p className="mt-2 text-sm text-slate-500">Check for a new version, then choose Update Now when you are ready.</p>
        {lastCheck && <p className="mt-2 text-xs text-slate-500">Last check: {lastCheck}</p>}
        {message && <p role="status" className="mt-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-800 dark:bg-sky-950/30 dark:text-sky-200">{message}</p>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
        {info?.available_version && <div className="mt-4 rounded-xl border border-emerald-200 p-4 dark:border-emerald-900">
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">New version available: {info.available_version}</p>
          {info.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-500">{info.notes}</p>}
        </div>}
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" disabled={action !== null} onClick={() => void checkUpdates()} className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
            <RefreshCw size={16} className={action === 'checking' ? 'animate-spin' : ''}/>{action === 'checking' ? 'Checking…' : 'Check for Updates'}
          </button>
          {info?.available_version && info.configured && !info.portable && <button type="button" disabled={action !== null} onClick={() => void installUpdate()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
            <Download size={16}/>{action === 'installing' ? 'Updating…' : 'Update Now'}
          </button>}
        </div>
      </>}
    </div>
  </section>;
}
