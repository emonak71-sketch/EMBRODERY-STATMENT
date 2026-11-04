import React, { useEffect, useState } from 'react';
import { Bell, Clock, Download, Monitor, RefreshCw, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { DEFAULT_REMINDER_TIMES, isValidReminderTime, ReminderTimes } from '../desktop/attendanceCore';
import { desktopInvoke, isWindowsDesktop } from '../desktop/tauriBridge';

export type ReminderPreferences = ReminderTimes & { enabled: boolean };
export const REMINDER_PREF_KEY = 'desktop_attendance_reminders_v1';
export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  enabled: true, ...DEFAULT_REMINDER_TIMES,
};

export function readReminderPreferences(): ReminderPreferences {
  try {
    const stored = JSON.parse(localStorage.getItem(REMINDER_PREF_KEY) || '{}');
    return {
      enabled: typeof stored.enabled === 'boolean' ? stored.enabled : true,
      morning: isValidReminderTime(stored.morning) ? stored.morning : DEFAULT_REMINDER_TIMES.morning,
      night: isValidReminderTime(stored.night) ? stored.night : DEFAULT_REMINDER_TIMES.night,
    };
  } catch { return { ...DEFAULT_REMINDER_PREFERENCES }; }
}

export interface DesktopUpdateInfo {
  current_version: string;
  available_version: string | null;
  notes: string | null;
  portable: boolean;
  configured: boolean;
}

const DesktopSettings: React.FC = () => {
  const {language} = useLanguage();
  const [preferences, setPreferences] = useState<ReminderPreferences>(readReminderPreferences);
  const [autostart, setAutostart] = useState(false);
  const [startMinimized, setStartMinimized] = useState(false);
  const [info, setInfo] = useState<DesktopUpdateInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastCheck, setLastCheck] = useState(localStorage.getItem('desktop_last_update_check') || '');
  const [message, setMessage] = useState('');

  const persistPreferences = (next:ReminderPreferences) => {
    setPreferences(next);
    localStorage.setItem(REMINDER_PREF_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('embroidery:reminder-preferences'));
  };

  useEffect(() => {
    if (!isWindowsDesktop()) return;
    void Promise.all([
      desktopInvoke<boolean>('desktop_get_autostart'),
      desktopInvoke<boolean>('desktop_get_start_minimized'),
      desktopInvoke<DesktopUpdateInfo>('desktop_info'),
    ]).then(([enabled,minimized,current]) => {
      setAutostart(enabled);
      setStartMinimized(minimized);
      setInfo(current);
      if (current.configured && !current.portable) void checkUpdates();
    }).catch(error => setMessage(String(error)));
  }, []);

  const updateAutostart = async (enabled:boolean) => {
    try {
      await desktopInvoke('desktop_set_autostart',{enabled});
      setAutostart(enabled);
      setMessage(enabled?'Windows startup enabled.':'Windows startup disabled.');
    } catch(e){ setMessage('Cannot change Windows startup: ' + String(e)); }
  };

  const updateMinimized = async (enabled:boolean) => {
    try {
      await desktopInvoke('desktop_set_start_minimized',{enabled});
      setStartMinimized(enabled);
      setMessage(enabled?'Start minimized to tray enabled.':'Normal startup enabled.');
    } catch(e){ setMessage('Cannot save startup preference: ' + String(e)); }
  };

  const checkUpdates = async () => {
    setBusy(true); setMessage('');
    try {
      const next=await desktopInvoke<DesktopUpdateInfo>('desktop_check_update');
      const checked=new Date().toLocaleString();
      localStorage.setItem('desktop_last_update_check',checked);
      setLastCheck(checked);
      setInfo(next);
      setMessage(next.portable
        ? 'Portable edition uses manual replacement. Keep the data folder when updating.'
        : !next.configured ? 'Secure updates are not configured. Set the official signing keys before releasing.'
        : next.available_version ? 'A signed update is available.' : 'No new version is available.');
    } catch(e){setMessage('Update check unavailable: ' + String(e));}
    finally{setBusy(false);}
  };

  const installUpdate = async () => {
    setBusy(true);setMessage('Downloading signed update...');
    try {
      await desktopInvoke('desktop_install_update');
    } catch(e) {
      setMessage('Update failed: '+String(e));
      setBusy(false);
    }
  };

  const testNotification = async () => {
    try {
      await desktopInvoke('desktop_test_notification',{language});
      setMessage('Notification requested. Windows notification settings determine whether it appears.');
    } catch(e){setMessage('Test failed: '+String(e));}
  };

  if (!isWindowsDesktop()) return null;

  return (
    <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary-600" />
        <div><h2 className="text-lg font-black uppercase tracking-tight">Windows Desktop &amp; Reminders</h2>
          <p className="text-xs text-slate-500">Attendance alerts · Startup · Software updates</p></div>
      </div>
      {message && <div role="status" className="mb-5 rounded-xl bg-sky-50 p-3 text-xs font-semibold text-sky-800 dark:bg-slate-800 dark:text-sky-200">{message}</div>}
      <div className="space-y-5">
        <label className="flex items-center justify-between gap-4 text-sm font-bold">
          Enable attendance reminders
          <input type="checkbox" checked={preferences.enabled} onChange={e=>persistPreferences({...preferences,enabled:e.target.checked})} className="h-5 w-5 accent-blue-600" />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-500"><Clock size={14} className="mr-1 inline"/> Morning time (Dhaka)
            <input type="time" value={preferences.morning} onChange={e=>persistPreferences({...preferences,morning:e.target.value})}
              className="mt-2 block w-full rounded-xl bg-slate-50 p-3 text-sm font-semibold dark:bg-slate-800" />
          </label>
          <label className="text-xs font-bold text-slate-500"><Clock size={14} className="mr-1 inline"/> Night time (Dhaka)
            <input type="time" value={preferences.night} onChange={e=>persistPreferences({...preferences,night:e.target.value})}
              className="mt-2 block w-full rounded-xl bg-slate-50 p-3 text-sm font-semibold dark:bg-slate-800" />
          </label>
        </div>
        <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
          <label className="flex items-center justify-between gap-4 text-sm font-bold">
            <span><Monitor size={16} className="mr-2 inline text-primary-600"/> Start when Windows signs in</span>
            <input type="checkbox" checked={autostart} onChange={e=>void updateAutostart(e.target.checked)} className="h-5 w-5 accent-blue-600" disabled={info?.portable}/>
          </label>
          <label className="mt-4 flex items-center justify-between gap-4 text-sm font-bold">
            Start minimized to System Tray
            <input type="checkbox" checked={startMinimized} onChange={e=>void updateMinimized(e.target.checked)} className="h-5 w-5 accent-blue-600"/>
          </label>
        </div>
        <div className="border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
          <p><strong>Current language:</strong> {language==='bn'?'বাংলা':'English'}</p>
          <p className="mt-1 text-slate-500">Reminders follow the language selected in the app, not Windows.</p>
          <button type="button" onClick={()=>void testNotification()} className="mt-3 rounded-xl border border-slate-200 px-4 py-2 font-bold transition-all hover:bg-slate-50 dark:border-slate-700">Test notification</button>
        </div>
        <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
          <h3 className="flex items-center gap-2 text-sm font-black"><ShieldCheck size={16} className="text-primary-600"/> Application Updates</h3>
          <p className="mt-2 text-xs text-slate-500">Current version: {info?.current_version||'Loading...'}</p>
          {info?.available_version && <p className="mt-1 text-xs font-bold text-emerald-600">Latest available: {info.available_version}</p>}
          {info?.notes && <div className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800">{info.notes}</div>}
          {lastCheck && <p className="mt-1 text-xs text-slate-500">Last check: {lastCheck}</p>}
          {info?.portable && <p className="mt-2 text-xs text-amber-600">Portable edition: close the app and replace the EXE with the latest release, keeping the data folder intact.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={()=>void checkUpdates()} disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-xs font-black text-white disabled:opacity-50">
              <RefreshCw size={14}/> Check for Updates
            </button>
            {info?.available_version && !info.portable && (
              <>
                <button type="button" onClick={()=>void installUpdate()} disabled={busy}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white disabled:opacity-50">
                  <Download size={14}/> Update Now
                </button>
                <button type="button" onClick={()=>{localStorage.setItem('desktop_update_dismissed',info.available_version||'');setMessage('You will be reminded after a newer version is published.');}}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold dark:border-slate-700">Remind Me Later</button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
export default DesktopSettings;
