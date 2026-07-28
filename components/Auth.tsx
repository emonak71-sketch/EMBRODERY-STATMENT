
import React, { useState } from 'react';
import { Landmark, ArrowRight, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

interface AuthProps {
  onLogin: (email: string, pass: string) => Promise<any>;
  onSignup: (email: string, pass: string, biz: string) => Promise<any>;
  onResetPassword: (email: string) => Promise<any>;
  onUpdatePassword: (pass: string) => Promise<any>;
  isResetting?: boolean;
}

const Auth: React.FC<AuthProps> = ({ onLogin, onSignup, onResetPassword, onUpdatePassword, isResetting = false }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(isResetting ? 'login' : 'login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    
    try {
      if (isResetting) {
        const res = await onUpdatePassword(pass);
        if (!res.success) setErrorMsg(res.message || 'Update failed');
        else setInfoMsg(res.message);
      } else if (mode === 'login') {
        const res = await onLogin(email, pass);
        if (!res.success) setErrorMsg(res.message || 'Login failed');
      } else if (mode === 'signup') {
        const res = await onSignup(email, pass, businessName);
        if (!res.success) {
          setErrorMsg(res.message || 'Signup failed');
        } else if (res.message) {
          setInfoMsg(res.message);
        }
      } else if (mode === 'forgot') {
        const res = await onResetPassword(email);
        if (!res.success) setErrorMsg(res.message || 'Reset failed');
        else setInfoMsg(res.message);
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (isResetting) return 'Update Password';
    if (mode === 'login') return 'Log In';
    if (mode === 'signup') return 'Create Profile';
    return 'Reset Password';
  };

  const getButtonText = () => {
    if (isResetting) return 'Update Password';
    if (mode === 'login') return 'Log In';
    if (mode === 'signup') return 'Create Profile';
    return 'Send Reset Link';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-12 duration-1000 ease-out">
          <div className="inline-flex p-4 bg-primary-600 rounded-[2rem] shadow-2xl shadow-primary-500/40 mb-6 hover:scale-110 transition-transform duration-500 cursor-pointer">
            <Landmark className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter animate-in fade-in slide-in-from-bottom-4 delay-300 duration-700">Embrodery Statement</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-3 animate-in fade-in delay-500 duration-1000">Professional Ledger Workspace</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-black/5 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 delay-200 duration-700">
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-8 text-center">{getTitle()}</h2>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm animate-in zoom-in-90 duration-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="font-bold leading-tight">{errorMsg}</p>
            </div>
          )}

          {infoMsg && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-start gap-3 text-emerald-600 dark:text-emerald-400 text-sm animate-in zoom-in-90 duration-300">
              <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              <p className="font-bold leading-tight">{infoMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && !isResetting && (
              <div className="space-y-2 animate-in slide-in-from-left-4 delay-300 duration-500">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Business Name</label>
                <input type="text" required className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-primary-500 transition-all font-bold" placeholder="e.g. Skyline Designs" value={businessName} onChange={e => setBusinessName(e.target.value)} />
              </div>
            )}
            
            {!isResetting && (
              <div className="space-y-2 animate-in slide-in-from-left-4 delay-400 duration-500">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Email Address</label>
                <input type="email" required className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-primary-500 transition-all font-bold" placeholder="admin@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            )}
            
            {(mode !== 'forgot' || isResetting) && (
              <div className="space-y-2 animate-in slide-in-from-left-4 delay-500 duration-500">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{isResetting ? 'New Password' : 'Password'}</label>
                <input type="password" required minLength={6} className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-primary-500 transition-all font-bold" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} />
              </div>
            )}

            {mode === 'login' && !isResetting && (
              <div className="flex justify-end px-1 animate-in fade-in delay-600 duration-500">
                <button type="button" onClick={() => { setMode('forgot'); setErrorMsg(null); setInfoMsg(null); }} className="text-[10px] font-black text-primary-600 hover:text-primary-700 transition-colors uppercase tracking-widest">
                  Forgot Password?
                </button>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-black py-5 rounded-2xl shadow-2xl shadow-primary-500/30 flex items-center justify-center gap-3 group transition-all uppercase text-xs tracking-[0.2em] mt-4 animate-in fade-in slide-in-from-bottom-4 delay-700 duration-500">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>{getButtonText()} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>

          <div className="mt-8 text-center animate-in fade-in delay-1000 duration-1000">
            {isResetting ? (
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Please enter your new password above.
              </p>
            ) : (
              <button onClick={() => { 
                if (mode === 'forgot') setMode('login');
                else setMode(mode === 'login' ? 'signup' : 'login'); 
                setErrorMsg(null); 
                setInfoMsg(null); 
              }} className="text-[10px] font-black text-primary-600 hover:text-primary-700 transition-colors uppercase tracking-[0.2em]">
                {mode === 'login' ? 'Establish New Profile' : (mode === 'signup' ? 'Existing Profile Login' : 'Back to Login')}
              </button>
            )}
          </div>
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest animate-in fade-in delay-[1200ms] duration-1000">
          <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verified Secure Session
        </div>
      </div>
    </div>
  );
};

export default Auth;
