
import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, Mail, Building, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import AppLockSettings from './AppLockSettings';
import { setupBiometrics } from './BiometricLock';
import { Fingerprint } from 'lucide-react';
import DesktopSettings from './DesktopSettings';
import AccountPlanStatus from './AccountPlanStatus';
import type { AccountAccess } from '../desktop/subscriptionStatus';

interface SettingsProps {
  setActiveTab?: (tab: string) => void;
  user: User | null;
  onUpdateProfile: (email: string, biz: string) => Promise<void>;
  onAppLockUpdated: (updatedAt: string) => void;
  accountAccess?: AccountAccess | null;
  onViewPlans?: () => void;
}


const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const Settings: React.FC<SettingsProps> = ({ user, onUpdateProfile, onAppLockUpdated, setActiveTab, accountAccess=null, onViewPlans }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState(user?.email || '');
  const [biz, setBiz] = useState(user?.business_name || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(() => localStorage.getItem('app_lock_enabled') === 'true');

  
  const handleToggleLock = async () => {
    if (lockEnabled) {
      localStorage.removeItem('app_lock_enabled');
      localStorage.removeItem('biometric_id');
      localStorage.removeItem('app_pin');
      setLockEnabled(false);
    } else {
      const res = await setupBiometrics(user?.email || 'user');
      if (res) setLockEnabled(true);
      else alert('Biometrics setup failed or cancelled.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      await onUpdateProfile(email, biz);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-10">
        {setActiveTab && (
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="p-3 bg-slate-100 dark:bg-slate-800 rounded-[1rem] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
        <div className="p-4 bg-primary-600 rounded-[1.5rem] shadow-xl shadow-primary-500/30">
          <SettingsIcon className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Workspace Settings</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manage your business profile</p>
        </div>
      </div>

      <AccountPlanStatus access={accountAccess} onViewPlans={onViewPlans}/>
      <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                <Building className="w-3 h-3" /> Business Name
              </label>
              <input
                type="text"
                value={biz}
                onChange={(e) => setBiz(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-5 text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white"
                placeholder="Your Company Name"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                <Mail className="w-3 h-3" /> Account Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-5 text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white"
                placeholder="admin@example.com"
              />
              <p className="text-[9px] text-slate-400 font-medium px-1 italic">Note: Changing email will require verification.</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-black py-5 rounded-2xl shadow-xl shadow-primary-500/20 flex items-center justify-center gap-3 group transition-all uppercase text-[10px] tracking-[0.3em]"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : success ? (
              <><CheckCircle2 className="w-5 h-5" /> Profile Updated</>
            ) : (
              <><Save className="w-5 h-5" /> Save Changes</>
            )}
          </button>
        </form>

        <AppLockSettings email={user?.email || ''} onUpdated={onAppLockUpdated} />

        {isMobileDevice() && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-slate-200/50 dark:shadow-black/20 border border-slate-100 dark:border-slate-800 mt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                <Fingerprint className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">ফেস আইডি / ফিঙ্গারপ্রিন্ট লক</h3>
                <p className="text-sm font-bold text-slate-500">অ্যাপ খোলার সময় বায়োমেট্রিক আনলক</p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={handleToggleLock}
              className={`w-14 h-8 rounded-full transition-colors relative ${lockEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <div className={`w-6 h-6 rounded-full bg-white absolute top-1 transition-transform ${lockEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
        )}

      </div>

      <DesktopSettings />

      <div className="p-8 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-[2rem]">
        <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 px-1">Security Information</h3>
        <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed font-medium">
          Your workspace data is end-to-end encrypted and managed via secure Supabase authentication. Any changes to your primary email address will trigger a confirmation link to be sent to both your old and new email for security verification.
        </p>
      </div>

      <section aria-label="About Embroidery Statement" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <img src="/embroidery-statement-mark.svg" alt="Embroidery Statement logo" className="h-16 w-16 rounded-2xl object-contain" />
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">About Embroidery Statement</h3>
            <p className="mt-1 text-xs text-slate-500">Brand identity &amp; application information</p>
          </div>
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-300">
          <p><strong>Owner:</strong> Em On</p>
          <p className="mt-2"><strong>Brand:</strong> Embroidery Statement</p>
          <p className="mt-2"><strong>Facebook:</strong> <a className="font-semibold text-primary-600 hover:underline" href="https://www.facebook.com/embroderystatment/" target="_blank" rel="noreferrer">facebook.com/embroderystatment</a></p>
          <p className="mt-2"><strong>WhatsApp:</strong> <a className="font-semibold text-primary-600 hover:underline" href="https://wa.me/8801650206700" target="_blank" rel="noreferrer">01650206700</a></p>
          <p className="mt-2"><strong>Brand &amp; logo ownership:</strong> Embroidery Statement</p>
          <p className="mt-2 text-slate-400">Official brand information and contact details.</p>
        </div>
      </section>
    </div>
  );
};

export default Settings;
