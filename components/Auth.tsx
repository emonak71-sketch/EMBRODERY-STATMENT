import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, AlertCircle, ShieldCheck, Mail, KeyRound, Eye, EyeOff } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot' | 'verify' | 'reset';

interface AuthResult {
  success: boolean;
  message?: string;
}

interface AuthProps {
  onLogin: (email: string, pass: string) => Promise<AuthResult>;
  onSignup: (email: string, pass: string, biz: string) => Promise<AuthResult>;
  onResetPassword: (email: string) => Promise<AuthResult>;
  onVerifyResetCode: (email: string, code: string) => Promise<AuthResult>;
  onUpdatePassword: (pass: string) => Promise<AuthResult>;
  isResetting?: boolean;
}

const Auth: React.FC<AuthProps> = ({
  onLogin,
  onSignup,
  onResetPassword,
  onVerifyResetCode,
  onUpdatePassword,
  isResetting = false
}) => {
  const [mode, setMode] = useState<AuthMode>(isResetting ? 'reset' : 'login');
  const [email, setEmail] = useState(() => localStorage.getItem('saved_email') || '');
  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [otp, setOtp] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isResetting) setMode('reset');
  }, [isResetting]);

  const cleanEmail = email.trim().toLowerCase();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      if (mode === 'login') {
        const result = await onLogin(cleanEmail, pass);
        if (!result.success) setErrorMsg(result.message || 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।');
        else localStorage.setItem('saved_email', cleanEmail);
      } else if (mode === 'signup') {
        if (pass.length < 8) {
          setErrorMsg('নিরাপত্তার জন্য পাসওয়ার্ড অন্তত ৮ অক্ষরের দিন।');
          return;
        }
        if (pass !== confirmPass) {
          setErrorMsg('দুটি পাসওয়ার্ড মিলছে না।');
          return;
        }
        const result = await onSignup(cleanEmail, pass, businessName.trim());
        if (!result.success) {
          setErrorMsg(result.message || 'অ্যাকাউন্ট তৈরি করা যায়নি।');
        } else {
          localStorage.setItem('saved_email', cleanEmail);
          setMode('login');
          setPass('');
          setConfirmPass('');
          setInfoMsg(result.message || 'অ্যাকাউন্ট তৈরি হয়েছে। এখন লগ-ইন করুন।');
        }
      } else if (mode === 'forgot') {
        const result = await onResetPassword(cleanEmail);
        if (!result.success) {
          setErrorMsg(result.message || 'কোড পাঠানো যায়নি। আবার চেষ্টা করুন।');
        } else {
          setMode('verify');
          setOtp('');
          setInfoMsg(result.message || 'আপনার ইমেইলে ৬ সংখ্যার কোড পাঠানো হয়েছে।');
        }
      } else if (mode === 'verify') {
        const code = otp.replace(/\D/g, '');
        if (!/^\d{6}$/.test(code)) {
          setErrorMsg('৬ সংখ্যার সঠিক কোডটি লিখুন।');
          return;
        }
        const result = await onVerifyResetCode(cleanEmail, code);
        if (!result.success) {
          setErrorMsg(result.message || 'কোডটি সঠিক নয় অথবা মেয়াদ শেষ হয়েছে।');
        } else {
          setMode('reset');
          setPass('');
          setConfirmPass('');
          setInfoMsg('কোড যাচাই হয়েছে। এখন নতুন পাসওয়ার্ড দিন।');
        }
      } else if (mode === 'reset') {
        if (pass.length < 8) {
          setErrorMsg('নতুন পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে।');
          return;
        }
        if (pass !== confirmPass) {
          setErrorMsg('নতুন পাসওয়ার্ড দুটি মিলছে না।');
          return;
        }
        const result = await onUpdatePassword(pass);
        if (!result.success) setErrorMsg(result.message || 'পাসওয়ার্ড আপডেট করা যায়নি।');
        else setInfoMsg(result.message || 'পাসওয়ার্ড পরিবর্তন হয়েছে।');
      }
    } catch (error) {
      console.error('Authentication flow failed:', error);
      setErrorMsg('একটি সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!cleanEmail || resending) return;
    setResending(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const result = await onResetPassword(cleanEmail);
      if (!result.success) setErrorMsg(result.message || 'নতুন কোড পাঠানো যায়নি।');
      else setInfoMsg('নতুন ৬ সংখ্যার কোড পাঠানোর অনুরোধ সফল হয়েছে।');
    } catch {
      setErrorMsg('কোড পুনরায় পাঠানো যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setResending(false);
    }
  };

  const title: Record<AuthMode, string> = {
    login: 'আপনার অ্যাকাউন্টে প্রবেশ করুন',
    signup: 'নতুন অ্যাকাউন্ট তৈরি করুন',
    forgot: 'পাসওয়ার্ড রিসেট করুন',
    verify: 'ইমেইল কোড যাচাই করুন',
    reset: 'নতুন পাসওয়ার্ড সেট করুন'
  };

  const buttonText: Record<AuthMode, string> = {
    login: 'নিরাপদে লগ-ইন করুন',
    signup: 'অ্যাকাউন্ট তৈরি করুন',
    forgot: '৬ সংখ্যার কোড পাঠান',
    verify: 'কোড যাচাই করুন',
    reset: 'নতুন পাসওয়ার্ড সংরক্ষণ করুন'
  };

  const showEmail = mode !== 'reset';
  const showPasswordField = mode === 'login' || mode === 'signup' || mode === 'reset';

  return (
    <main className="auth-shell min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:px-6 font-sans">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-7 auth-brand-enter">
          <img
            src="/embroidery-statement-logo.jpg"
            alt="Embroidery Statement"
            className="mx-auto mb-4 w-36 sm:w-44 max-w-full rounded-2xl auth-logo"
            fetchPriority="high"
          />
          <p className="text-sm font-bold tracking-[0.18em] text-slate-500 dark:text-slate-400">
            EMBROIDERY BUSINESS WORKSPACE
          </p>
        </div>

        <section className="auth-panel rounded-[2rem] p-6 sm:p-9">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl auth-icon">
              {mode === 'verify' ? <KeyRound className="h-7 w-7" /> : mode === 'forgot' || mode === 'reset' ? <ShieldCheck className="h-7 w-7" /> : <Mail className="h-7 w-7" />}
            </div>
            <h1 className="text-2xl sm:text-[1.7rem] font-black tracking-tight text-slate-900 dark:text-white">{title[mode]}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {mode === 'login' && 'আপনার ব্যবসার হিসাব নিরাপদে পরিচালনা করুন।'}
              {mode === 'signup' && 'আপনার ব্যবসার জন্য নতুন Workspace খুলুন।'}
              {mode === 'forgot' && 'আপনার অ্যাকাউন্টের ইমেইল দিন। আমরা ৬ সংখ্যার যাচাইকরণ কোড পাঠাব।'}
              {mode === 'verify' && 'ইমেইলে পাওয়া ৬ সংখ্যার কোডটি এখানে লিখুন।'}
              {mode === 'reset' && 'কোড যাচাই সম্পন্ন হয়েছে। এখন নতুন পাসওয়ার্ড তৈরি করুন।'}
            </p>
          </div>

          {errorMsg && (
            <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div role="status" className="mb-5 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50/90 p-4 text-sm font-semibold text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">ব্যবসার নাম</span>
                <input
                  type="text"
                  required
                  autoComplete="organization"
                  value={businessName}
                  onChange={event => setBusinessName(event.target.value)}
                  className="auth-input"
                  placeholder="যেমন: Emon Embroidery"
                />
              </label>
            )}

            {showEmail && (
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">ইমেইল ঠিকানা</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="auth-input"
                  placeholder="name@gmail.com"
                />
              </label>
            )}

            {mode === 'verify' && (
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">৬ সংখ্যার OTP</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="auth-input text-center text-2xl font-black tracking-[0.55em]"
                  placeholder="••••••"
                />
              </label>
            )}

            {showPasswordField && (
              <>
                <label className="block space-y-2">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {mode === 'reset' ? 'নতুন পাসওয়ার্ড' : 'পাসওয়ার্ড'}
                  </span>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={mode === 'login' ? 6 : 8}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={pass}
                      onChange={event => setPass(event.target.value)}
                      className="auth-input pr-12"
                      placeholder="কমপক্ষে ৮ অক্ষর"
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowPassword(value => !value)}
                      aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখান'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </label>

                {(mode === 'signup' || mode === 'reset') && (
                  <label className="block space-y-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">পাসওয়ার্ড নিশ্চিত করুন</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={confirmPass}
                      onChange={event => setConfirmPass(event.target.value)}
                      className="auth-input"
                      placeholder="আবার পাসওয়ার্ড লিখুন"
                    />
                  </label>
                )}
              </>
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <button type="button" onClick={() => { setMode('forgot'); setErrorMsg(null); setInfoMsg(null); }} className="text-sm font-bold text-primary-600 hover:text-primary-700 dark:text-primary-300">
                  পাসওয়ার্ড ভুলে গেছেন?
                </button>
              </div>
            )}

            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{buttonText[mode]} <ArrowRight className="h-5 w-5" /></>}
            </button>
          </form>

          {mode === 'verify' && (
            <button type="button" onClick={handleResendCode} disabled={resending || loading} className="mt-4 w-full text-sm font-bold text-primary-600 hover:text-primary-700 disabled:opacity-50 dark:text-primary-300">
              {resending ? 'কোড পাঠানো হচ্ছে…' : 'কোড পাননি? আবার পাঠান'}
            </button>
          )}

          <div className="mt-6 border-t border-slate-200/70 pt-5 text-center dark:border-white/10">
            {mode === 'reset' ? (
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">নতুন পাসওয়ার্ড সংরক্ষণ হলে আপনি অ্যাপে প্রবেশ করতে পারবেন।</p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setInfoMsg(null);
                  setOtp('');
                  setPass('');
                  setConfirmPass('');
                  if (mode === 'forgot' || mode === 'verify') setMode('login');
                  else setMode(mode === 'login' ? 'signup' : 'login');
                }}
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-primary-700 dark:text-slate-300 dark:hover:text-primary-300"
              >
                <ArrowLeft className="h-4 w-4" />
                {mode === 'login' ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : mode === 'signup' ? 'লগ-ইন-এ ফিরে যান' : 'লগ-ইন-এ ফিরে যান'}
              </button>
            )}
          </div>
        </section>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          Secure Supabase Authentication
        </div>
      </div>
    </main>
  );
};

export default Auth;
