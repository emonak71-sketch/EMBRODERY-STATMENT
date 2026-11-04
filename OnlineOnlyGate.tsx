import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CloudOff, RefreshCw, ShieldAlert } from 'lucide-react';
import { supabaseAnonKey, supabaseUrl } from './services/supabaseClient';

const OnlineOnlyGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const inFlight = useRef(false);

  const verify = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setConnected(false);
      setChecking(false);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 7000);
    try {
      const endpoint = supabaseUrl.replace(/\/+$/, '') + '/rest/v1/Parties?select=id&limit=1';
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { apikey: supabaseAnonKey, Authorization: 'Bearer ' + supabaseAnonKey },
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Live database health check failed: ' + response.status);
      setConnected(true);
      setLastCheck(new Date());
    } catch {
      setConnected(false);
    } finally {
      window.clearTimeout(timeout);
      inFlight.current = false;
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const check = () => { if (active) void verify(); };
    const onOffline = () => { setConnected(false); setChecking(false); };
    const onOnline = () => { setChecking(true); check(); };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    check();
    const timer = window.setInterval(check, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [verify]);

  if (connected) return <>{children}</>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/90 p-8 text-center shadow-2xl sm:p-10">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300"><CloudOff size={30} /></div>
        <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-sky-300">Embroidery Statement · Secure Workspace</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{checking ? 'Verifying live database' : 'Internet connection required'}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">{checking ? 'Connecting to the live business database. Cached business records are never displayed.' : 'The live database is unreachable. Business data and editing tools remain locked until a connection is restored.'}</p>
        <div className="mt-7 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-slate-300"><ShieldAlert size={15} className="text-amber-300" /> No offline business-data access</div>
        <button onClick={() => { setChecking(true); void verify(); }} disabled={checking} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-500 disabled:opacity-50"><RefreshCw size={15} className={checking ? 'animate-spin' : ''} /> Retry connection</button>
        {lastCheck && <p className="mt-4 text-[10px] text-slate-500">Last verified: {lastCheck.toLocaleTimeString()}</p>}
      </section>
    </main>
  );
};

export default OnlineOnlyGate;
