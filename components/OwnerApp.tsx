import React, { useEffect, useState } from 'react';
import { ArrowRight, LockKeyhole, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { dbService } from '../services/supabaseService';
import OwnerControlCenter from './OwnerControlCenter';

type OwnerUser = { id: string; email: string };

const OwnerApp: React.FC = () => {
  const [user, setUser] = useState<OwnerUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [checkingRole, setCheckingRole] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [email, setEmail] = useState(localStorage.getItem('owner_saved_email') || '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return;
      setUser(session?.user ? { id: session.user.id, email: session.user.email || '' } : null);
      setCheckingSession(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setUser(session?.user ? { id: session.user.id, email: session.user.email || '' } : null);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let alive = true;
    if (!user) {
      setIsOwner(false);
      setCheckingRole(false);
      return;
    }
    setCheckingRole(true);
    dbService.isBillingAdmin().then(async allowed => {
      if (!alive) return;
      setIsOwner(Boolean(allowed));
      if (!allowed) {
        await supabase.auth.signOut({ scope: 'local' });
        setError('This account is not authorised to access the Owner Control Center.');
      }
    }).catch(async () => {
      if (!alive) return;
      setIsOwner(false);
      setError('Owner permission could not be verified. Check your connection and try again.');
      await supabase.auth.signOut({ scope: 'local' });
    }).finally(() => { if (alive) setCheckingRole(false); });
    return () => { alive = false; };
  }, [user?.id]);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (authError || !data.user) throw new Error(authError?.message || 'Sign-in failed.');
      const { data: role, error: roleError } = await supabase
        .from('billing_admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
      if (roleError) throw roleError;
      if (!role?.user_id) {
        await supabase.auth.signOut({ scope: 'local' });
        throw new Error('This Gmail account is not registered as the Owner. Customer accounts cannot enter this Control Center.');
      }
      localStorage.setItem('owner_saved_email', email.trim().toLowerCase());
      setUser({ id: data.user.id, email: data.user.email || email.trim() });
      setIsOwner(true);
    } catch (err: any) {
      setError(err?.message || 'Could not sign in. Check your email and password.');
    } finally {
      setBusy(false);
    }
  };

  if (checkingSession || (user && checkingRole)) {
    return <div className="min-h-screen grid place-items-center bg-slate-950 text-white"><div className="flex items-center gap-3 text-sm font-semibold"><Loader2 className="animate-spin" /> Verifying secure owner access…</div></div>;
  }

  if (user && isOwner) {
    return <OwnerControlCenter user={user} onLogout={async () => { await supabase.auth.signOut({ scope: 'local' }); setUser(null); setIsOwner(false); }} />;
  }

  return (
    <main className="owner-auth-screen min-h-screen overflow-hidden bg-[#071a35] px-4 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 opacity-30" style={{background:'radial-gradient(circle at 15% 20%, #0b8fe5 0, transparent 34%), radial-gradient(circle at 85% 75%, #0d9488 0, transparent 30%)'}} />
      <div className="relative mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
        <section className="owner-auth-panel grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur-xl md:grid-cols-[1.05fr_.95fr]">
          <div className="hidden flex-col justify-between bg-gradient-to-br from-blue-950 to-slate-950 p-10 md:flex">
            <div>
              <img src="/embroidery-statement-mark.svg" alt="Embroidery Statement" className="mb-8 h-16 w-16 rounded-2xl bg-white p-2" />
              <div className="text-xs font-black uppercase tracking-[.25em] text-sky-300">Business Operations</div>
              <h1 className="mt-4 text-4xl font-black leading-tight">Owner Control Center</h1>
              <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">Manage customers, activate subscriptions, monitor support requests and keep every customer application in sync.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400"><ShieldCheck size={16} className="text-emerald-400" /> Owner identity is verified by Supabase on every session.</div>
          </div>
          <div className="p-7 sm:p-10">
            <div className="mb-8 md:hidden"><img src="/embroidery-statement-mark.svg" alt="Embroidery Statement" className="mb-4 h-14 w-14 rounded-2xl bg-white p-2" /></div>
            <div className="mb-8">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-sky-200"><LockKeyhole size={12}/> Private administration</div>
              <h2 className="text-2xl font-black">Owner sign in</h2>
              <p className="mt-2 text-sm text-slate-400">Use the Gmail account already registered in the billing_admins table.</p>
            </div>
            {error && <div role="alert" className="mb-5 flex gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs leading-5 text-rose-100"><AlertTriangle size={16} className="mt-0.5 shrink-0"/>{error}</div>}
            <form onSubmit={signIn} className="space-y-4">
              <label className="block text-xs font-bold text-slate-300">Owner Gmail
                <input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="owner@gmail.com" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-sm text-white outline-none transition focus:border-sky-400" />
              </label>
              <label className="block text-xs font-bold text-slate-300">Password
                <input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-sm text-white outline-none transition focus:border-sky-400" />
              </label>
              <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-4 text-sm font-black shadow-lg shadow-sky-950/40 transition hover:bg-sky-500 disabled:opacity-50">{busy?<Loader2 className="animate-spin" size={17}/>:<>Open Control Center <ArrowRight size={17}/></>}</button>
            </form>
            <p className="mt-6 text-center text-[11px] leading-5 text-slate-500">Customer accounts are blocked from this portal. No account registration is available here.</p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default OwnerApp;
