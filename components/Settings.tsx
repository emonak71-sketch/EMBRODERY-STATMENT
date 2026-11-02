import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, Mail, Building, Loader2, CheckCircle2, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';
import { User, TabType } from '../types';

interface SettingsProps {
  setActiveTab?: (tab: TabType) => void;
  user: User | null;
  onUpdateProfile: (email: string, biz: string) => Promise<void>;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdateProfile, setActiveTab }) => {
  const [email, setEmail] = useState(user?.email || '');
  const [biz, setBiz] = useState(user?.business_name || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setSuccess(false);
    setErrorMessage(null);
    setInfoMessage(null);
    try {
      await onUpdateProfile(email.trim(), biz.trim());
      setSuccess(true);
      setInfoMessage('Workspace profile saved. If you changed your email, check your inbox for the verification message.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'প্রোফাইল আপডেট করা যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page mx-auto w-full max-w-3xl space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center gap-4">
        {setActiveTab && (
          <button
            type="button"
            aria-label="Back to dashboard"
            onClick={() => setActiveTab('dashboard')}
            className="settings-icon-button"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="settings-heading-icon">
          <SettingsIcon className="h-6 w-6 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-primary-600 dark:text-cyan-300">Workspace</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Settings</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your business identity and account details.</p>
        </div>
      </header>

      <section className="settings-surface rounded-[2rem] p-5 sm:p-8">
        <div className="mb-7 flex items-center gap-3">
          <div className="settings-section-icon"><Building className="h-5 w-5" /></div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Business profile</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">These details appear on customer statements.</p>
          </div>
        </div>

        {errorMessage && (
          <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {errorMessage}
          </div>
        )}
        {infoMessage && (
          <div role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {infoMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block space-y-2">
            <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Building className="h-4 w-4" /> Business name
            </span>
            <input
              type="text"
              value={biz}
              onChange={event => setBiz(event.target.value)}
              required
              maxLength={80}
              autoComplete="organization"
              className="settings-input"
              placeholder="Your embroidery business"
            />
          </label>

          <label className="block space-y-2">
            <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Mail className="h-4 w-4" /> Account email
            </span>
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              className="settings-input"
              placeholder="name@gmail.com"
            />
            <span className="block text-xs leading-5 text-slate-500 dark:text-slate-400">Changing the email address may require confirmation from your email inbox.</span>
          </label>

          <button type="submit" disabled={loading} className="settings-save-button">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : success ? <CheckCircle2 className="h-5 w-5" /> : <Save className="h-5 w-5" />}
            {loading ? 'Saving profile…' : success ? 'Profile saved' : 'Save changes'}
          </button>
        </form>
      </section>

      <section className="settings-security rounded-[1.75rem] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="settings-security-icon"><ShieldCheck className="h-5 w-5" /></div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Account security</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Sign-in and password recovery are handled by Supabase Authentication. Access to customer and ledger records is controlled by the policies configured in the connected database. Never share your password or one-time recovery code.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Settings;
