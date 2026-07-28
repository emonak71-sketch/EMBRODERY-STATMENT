
import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, Mail, Building, Loader2, CheckCircle2 } from 'lucide-react';
import { User } from '../types';

interface SettingsProps {
  user: User | null;
  onUpdateProfile: (email: string, biz: string) => Promise<void>;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdateProfile }) => {
  const [email, setEmail] = useState(user?.email || '');
  const [biz, setBiz] = useState(user?.business_name || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
        <div className="p-4 bg-primary-600 rounded-[1.5rem] shadow-xl shadow-primary-500/30">
          <SettingsIcon className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Workspace Settings</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manage your business profile</p>
        </div>
      </div>

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
                <Mail className="w-3 h-3" /> Admin Email Address
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
      </div>

      <div className="p-8 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-[2rem]">
        <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 px-1">Security Information</h3>
        <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed font-medium">
          Your workspace data is end-to-end encrypted and managed via secure Supabase authentication. Any changes to your primary email address will trigger a confirmation link to be sent to both your old and new email for security verification.
        </p>
      </div>
    </div>
  );
};

export default Settings;
