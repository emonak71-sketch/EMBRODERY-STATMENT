import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { dbService } from '../services/supabaseService';

interface AppLockSettingsProps {
  email: string;
  onUpdated: (updatedAt: string) => void;
}

type PanelMode = 'closed' | 'change' | 'reset';

const AppLockSettings: React.FC<AppLockSettingsProps> = ({ email, onUpdated }) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const tr = (bangla: string, english: string) => bn ? bangla : english;
  const [mode, setMode] = useState<PanelMode>('closed');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    dbService.getAppLockStatus().then(status => {
      if (active) setEnabled(status.enabled);
    }).catch(() => {
      if (active) setEnabled(null);
    });
    return () => { active = false; };
  }, []);

  const requestReset = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await dbService.requestAppLockReset(email);
      if (!result.success) throw new Error(result.message || 'Could not send OTP.');
      setMode('reset');
      setMessage(tr('আপনার Gmail-এ ৮ সংখ্যার OTP পাঠানো হয়েছে।', 'An 8-digit OTP has been sent to your Gmail.'));
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('OTP পাঠানো যায়নি।', 'Could not send OTP.'));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setMessage('');
    if (newPassword.length < 8) { setError(tr('নতুন পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে।', 'New password must be at least 8 characters.')); return; }
    if (newPassword !== confirmPassword) { setError(tr('দুটি পাসওয়ার্ড মিলছে না।', 'The passwords do not match.')); return; }
    if (mode === 'reset' && !/^\d{8}$/.test(otp)) { setError(tr('সঠিক ৮ সংখ্যার OTP লিখুন।', 'Enter the exact 8-digit OTP.')); return; }

    setBusy(true);
    try {
      const result = mode === 'change'
        ? await dbService.changeAppLock(currentPassword, newPassword)
        : await dbService.resetAppLockWithOtp(email, otp, newPassword);
      onUpdated(result.updatedAt);
      setMode('closed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      setMessage(tr('App Lock Password সব Device-এ আপডেট হয়েছে।', 'App Lock password updated across your devices.'));
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('পাসওয়ার্ড আপডেট করা যায়নি।', 'Could not update the password.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300"><ShieldCheck className="h-6 w-6" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{tr('App Lock Security', 'App Lock Security')}</h2>
            {enabled === true && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{tr('সক্রিয়', 'Enabled')}</span>}
            {enabled === false && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{tr('সেটআপ প্রয়োজন', 'Setup required')}</span>}
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{tr('একই App Lock Password আপনার Web App ও Windows EXE-তে Sync হবে।', 'One App Lock password syncs across your Web App and Windows EXE.')}</p>
          <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-400"><Mail className="h-3.5 w-3.5" />{email}</p>
        </div>
      </div>

      {message && <div role="status" className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{message}</div>}
      {error && <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

      {mode === 'closed' ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => { setMode('change'); setError(''); setMessage(''); }} disabled={enabled !== true} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white transition hover:bg-blue-700 disabled:opacity-40"><KeyRound className="h-4 w-4" />{tr('Change Password', 'Change Password')}</button>
          <button type="button" onClick={() => void requestReset()} disabled={busy || enabled !== true} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Mail className="h-4 w-4" />{tr('Forgot Password', 'Forgot Password')}</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === 'change' && (
            <label className="block space-y-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              {tr('বর্তমান App Lock Password', 'Current App Lock password')}
              <input type="password" required autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
            </label>
          )}
          {mode === 'reset' && (
            <label className="block space-y-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              {tr('Gmail-এর ৮ সংখ্যার OTP', '8-digit Gmail OTP')}
              <input type="text" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-lg font-black tracking-[0.3em] text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="••••••••" />
              <button type="button" onClick={() => void requestReset()} disabled={busy} className="text-xs font-bold text-blue-600 hover:text-blue-500">{tr('OTP আবার পাঠান', 'Resend OTP')}</button>
            </label>
          )}
          <label className="block space-y-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            {tr('নতুন App Lock Password', 'New App Lock password')}
            <input type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </label>
          <label className="block space-y-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            {tr('নতুন পাসওয়ার্ড নিশ্চিত করুন', 'Confirm new password')}
            <input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-black text-white transition hover:bg-blue-700 disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}{tr('Password সংরক্ষণ করুন', 'Save password')}</button>
            <button type="button" onClick={() => { setMode('closed'); setError(''); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setOtp(''); }} className="rounded-xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">{tr('Cancel', 'Cancel')}</button>
          </div>
        </form>
      )}
      <div className="mt-5 flex items-center gap-2 text-[11px] leading-5 text-slate-400"><LockKeyhole className="h-3.5 w-3.5 shrink-0" />{tr('Password hash সার্ভারে সংরক্ষিত হয়; আসল Password Database-এ রাখা হয় না।', 'Only a password hash is stored on the server; the original password is never stored.')}</div>
    </section>
  );
};

export default AppLockSettings;
