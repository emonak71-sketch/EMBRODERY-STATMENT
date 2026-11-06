import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, LogOut, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { dbService } from '../services/supabaseService';

type GateMode = 'setup' | 'unlock' | 'unavailable';
type ViewMode = 'setup' | 'unlock' | 'forgot' | 'reset' | 'unavailable';

interface AppLockGateProps {
  mode: GateMode;
  email: string;
  onUnlock: (updatedAt: string) => void;
  onLogout: () => void;
  onRetry: () => void;
}

const AppLockGate: React.FC<AppLockGateProps> = ({ mode, email, onUnlock, onLogout, onRetry }) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const tr = (bangla: string, english: string) => bn ? bangla : english;
  const [view, setView] = useState<ViewMode>(mode);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setView(mode);
    setError('');
    setMessage('');
  }, [mode]);

  const requestResetCode = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await dbService.requestAppLockReset(email);
      if (!result.success) throw new Error(result.message || 'Could not send the verification code.');
      setView('reset');
      setMessage(tr('আপনার Gmail-এ ৮ সংখ্যার OTP পাঠানো হয়েছে।', 'An 8-digit OTP has been sent to your Gmail.'));
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('OTP পাঠানো যায়নি। আবার চেষ্টা করুন।', 'Could not send the OTP. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setMessage('');

    if ((view === 'setup' || view === 'reset') && password.length < 8) {
      setError(tr('পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে।', 'Password must be at least 8 characters.'));
      return;
    }
    if ((view === 'setup' || view === 'reset') && password !== confirmPassword) {
      setError(tr('দুটি পাসওয়ার্ড মিলছে না।', 'The passwords do not match.'));
      return;
    }
    if (view === 'reset' && !/^\d{8}$/.test(otp)) {
      setError(tr('সঠিক ৮ সংখ্যার OTP লিখুন।', 'Enter the exact 8-digit OTP.'));
      return;
    }

    setBusy(true);
    try {
      if (view === 'setup') {
        const result = await dbService.setAppLock(password);
        onUnlock(result.updatedAt);
      } else if (view === 'unlock') {
        const result = await dbService.verifyAppLock(password);
        onUnlock(result.updatedAt);
      } else if (view === 'reset') {
        const result = await dbService.resetAppLockWithOtp(email, otp, password);
        onUnlock(result.updatedAt);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('অ্যাপ লক যাচাই করা যায়নি। আবার চেষ্টা করুন।', 'Could not verify the App Lock. Please try again.'));
    } finally {
      setBusy(false);
      setPassword('');
      setConfirmPassword('');
    }
  };

  const title = view === 'setup'
    ? tr('App Lock তৈরি করুন', 'Create your App Lock')
    : view === 'unlock'
      ? tr('App Unlock করুন', 'Unlock Embroidery Statement')
      : view === 'forgot'
        ? tr('App Lock Reset', 'Reset App Lock')
        : view === 'reset'
          ? tr('নতুন App Lock Password', 'Set a new App Lock password')
          : tr('ইন্টারনেট সংযোগ প্রয়োজন', 'Internet connection required');

  const subtitle = view === 'setup'
    ? tr('আপনার অ্যাকাউন্টের জন্য একটি আলাদা পাসওয়ার্ড সেট করুন। এটি সব Device-এ একই থাকবে।', 'Create a separate password for this account. The same password will work on all your devices.')
    : view === 'unlock'
      ? tr('আপনার App Lock Password লিখুন।', 'Enter your App Lock password to continue.')
      : view === 'forgot'
        ? tr('আপনার Account Gmail-এ ৮ সংখ্যার OTP পাঠানো হবে।', 'We will send an 8-digit OTP to your account Gmail.')
        : view === 'reset'
          ? tr('Gmail-এ পাঠানো ৮ সংখ্যার OTP এবং নতুন পাসওয়ার্ড লিখুন।', 'Enter the 8-digit OTP from Gmail and choose a new password.')
          : tr('একই App Lock সব Device-এ যাচাই করতে ইন্টারনেট প্রয়োজন।', 'Connect to the internet to verify the shared App Lock.');

  return (
    <main className="app-lock-screen min-h-screen flex items-center justify-center bg-[#07111f] px-4 py-8 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(148,163,184,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.35) 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
      </div>

      <section className="app-lock-panel relative z-10 w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-900/90 p-7 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-9">
        <div className="app-lock-heading mb-7 text-center">
          <div className="app-lock-emblem mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 shadow-lg shadow-blue-950/40">
            {view === 'reset' || view === 'forgot' ? <Mail className="h-8 w-8 text-cyan-300" /> : <ShieldCheck className="h-8 w-8 text-cyan-300" />}
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Embroidery Statement · Secure Access</p>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">{subtitle}</p>
          {email && <p className="mt-3 text-xs font-bold text-slate-300">{email}</p>}
        </div>

        {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        {message && <div role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />{message}</div>}

        {view === 'unavailable' ? (
          <button type="button" onClick={onRetry} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 text-sm font-black transition hover:bg-blue-500">
            <RefreshCw className="h-4 w-4" /> {tr('আবার চেষ্টা করুন', 'Retry connection')}
          </button>
        ) : view === 'forgot' ? (
          <div className="space-y-3">
            <button type="button" onClick={() => void requestResetCode()} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 text-sm font-black transition hover:bg-blue-500 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {tr('Gmail-এ OTP পাঠান', 'Send OTP to Gmail')}
            </button>
            <button type="button" onClick={() => { setView('unlock'); setError(''); setMessage(''); }} className="w-full rounded-xl py-3 text-sm font-bold text-slate-400 hover:text-white">
              {tr('ফিরে যান', 'Back to unlock')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="app-lock-form space-y-4">
            {(view === 'setup' || view === 'unlock') && (
              <label className="block space-y-2">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-300"><LockKeyhole className="h-4 w-4 text-cyan-300" />{tr('App Lock Password', 'App Lock password')}</span>
                <div className="relative">
                  <input autoFocus type={showPassword ? 'text' : 'password'} required minLength={view === 'setup' ? 8 : undefined} autoComplete={view === 'setup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-4 pr-12 text-sm font-semibold text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20" placeholder={tr('পাসওয়ার্ড লিখুন', 'Enter password')} />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-3 text-slate-400 hover:text-white" aria-label="Toggle password visibility">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </div>
              </label>
            )}

            {(view === 'setup' || view === 'reset') && (
              <label className="block space-y-2">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-300"><KeyRound className="h-4 w-4 text-cyan-300" />{tr('পাসওয়ার্ড নিশ্চিত করুন', 'Confirm password')}</span>
                <input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-4 text-sm font-semibold text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20" placeholder={tr('আবার পাসওয়ার্ড লিখুন', 'Re-enter password')} />
              </label>
            )}

            {view === 'reset' && (
              <>
                <label className="block space-y-2">
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-300"><Mail className="h-4 w-4 text-cyan-300" />{tr('৮ সংখ্যার Gmail OTP', '8-digit Gmail OTP')}</span>
                  <input type="text" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-4 text-center text-xl font-black tracking-[0.35em] text-white outline-none focus:border-cyan-400" placeholder="••••••••" />
                </label>
                <button type="button" onClick={() => void requestResetCode()} disabled={busy} className="text-xs font-bold text-cyan-300 hover:text-cyan-200 disabled:opacity-50">{tr('OTP আবার পাঠান', 'Resend OTP')}</button>
              </>
            )}

            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-950/40 transition hover:brightness-110 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {view === 'setup' ? tr('App Lock সেট করুন', 'Set App Lock') : view === 'unlock' ? tr('Unlock করুন', 'Unlock app') : tr('নতুন Password সংরক্ষণ করুন', 'Save new password')}
            </button>
            {view === 'unlock' && <button type="button" onClick={() => { setView('forgot'); setError(''); setMessage(''); }} className="w-full py-2 text-sm font-bold text-cyan-300 hover:text-cyan-200">{tr('পাসওয়ার্ড ভুলে গেছেন?', 'Forgot App Lock password?')}</button>}
          </form>
        )}

        <div className="mt-7 border-t border-white/10 pt-5 text-center">
          <p className="mb-3 text-[11px] leading-5 text-slate-500">{tr('এই App Lock Password আপনার Account Password থেকে আলাদা এবং সব Device-এ একই থাকবে।', 'This App Lock password is separate from your account password and syncs across your devices.')}</p>
          <button type="button" onClick={onLogout} className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 transition hover:text-white"><LogOut className="h-4 w-4" />{tr('Log out', 'Log out')}</button>
        </div>
      </section>
    </main>
  );
};

export default AppLockGate;
