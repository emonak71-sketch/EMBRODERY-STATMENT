import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Loader2, AlertCircle, ShieldCheck, Mail,
  KeyRound, Eye, EyeOff, Languages, LockKeyhole, Building2, Sparkles
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

type AuthMode = 'login' | 'signup' | 'signup-verify' | 'forgot' | 'verify' | 'reset';
interface AuthResult { success: boolean; message?: string; requiresVerification?: boolean; }
interface AuthProps {
  onLogin: (email: string, pass: string) => Promise<AuthResult>;
  onSignup: (email: string, pass: string, biz: string) => Promise<AuthResult>;
  onVerifySignupCode: (email: string, code: string) => Promise<AuthResult>;
  onResendSignupCode: (email: string) => Promise<AuthResult>;
  onResetPassword: (email: string) => Promise<AuthResult>;
  onVerifyResetCode: (email: string, code: string) => Promise<AuthResult>;
  onUpdatePassword: (pass: string) => Promise<AuthResult>;
  isResetting?: boolean;
}

const Auth: React.FC<AuthProps> = ({
  onLogin, onSignup, onVerifySignupCode, onResendSignupCode, onResetPassword, onVerifyResetCode, onUpdatePassword,
  isResetting = false
}) => {
  const { language, setLanguage } = useLanguage();
  const bn = language === 'bn';
  const tr = (bangla: string, english: string) => bn ? bangla : english;
  // The backend can return Bengali feedback even while the UI is set to English.
  const localizedMessage = (message: string | undefined, bangla: string, english: string) => {
    if (!message?.trim()) return tr(bangla, english);
    const messageIsBengali = /[\u0980-\u09FF]/.test(message);
    return messageIsBengali === bn ? message : tr(bangla, english);
  };
  // Supabase email OTP length is configurable from 6 to 10 digits.
  const validOtp = (code: string) => /^\d{6,10}$/.test(code);

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
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const transitionTimer = useRef<number | null>(null);

  useEffect(() => { if (isResetting) setMode('reset'); }, [isResetting]);
  useEffect(() => () => { if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current); }, []);

  const cleanEmail = email.trim().toLowerCase();
  const clearMessages = () => { setErrorMsg(null); setInfoMsg(null); };
  const switchMode = (next: AuthMode) => {
    if (next === mode) return;
    clearMessages();
    setOtp('');
    setPass('');
    setConfirmPass('');
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    setTransitionPhase('out');
    transitionTimer.current = window.setTimeout(() => {
      setMode(next);
      setTransitionPhase('in');
      transitionTimer.current = window.setTimeout(() => setTransitionPhase('idle'), 760);
    }, 180);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    clearMessages();
    try {
      if (mode === 'login') {
        const result = await onLogin(cleanEmail, pass);
        if (!result.success) setErrorMsg(localizedMessage(result.message, 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।', 'The email or password is incorrect.'));
        else localStorage.setItem('saved_email', cleanEmail);
      } else if (mode === 'signup') {
        if (pass.length < 8) {
          setErrorMsg(tr('পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে।', 'Password must be at least 8 characters.'));
          return;
        }
        if (pass !== confirmPass) {
          setErrorMsg(tr('দুটি পাসওয়ার্ড মিলছে না।', 'The passwords do not match.'));
          return;
        }
        const result = await onSignup(cleanEmail, pass, businessName.trim());
        if (!result.success) setErrorMsg(localizedMessage(result.message, 'অ্যাকাউন্ট তৈরি করা যায়নি।', 'Could not create the account.'));
        else if (result.requiresVerification !== false) {
          localStorage.setItem('saved_email', cleanEmail);
          switchMode('signup-verify');
          setInfoMsg(localizedMessage(result.message, 'আপনার Gmail-এ যাচাইকরণ কোড পাঠানো হয়েছে। অ্যাকাউন্ট চালু করতে কোডটি লিখুন।', 'A verification code has been sent to your email. Enter it to activate your account.'));
        } else {
          localStorage.setItem('saved_email', cleanEmail);
          setInfoMsg(localizedMessage(result.message, 'অ্যাকাউন্ট তৈরি হয়েছে।', 'Your account has been created.'));
        }
      } else if (mode === 'signup-verify') {
        const code = otp.replace(/\D/g, '');
        if (!validOtp(code)) {
          setErrorMsg(tr('ইমেইলে পাওয়া সম্পূর্ণ কোডটি লিখুন (৬–১০ সংখ্যা)।', 'Enter the complete code from your email (6–10 digits).'));
          return;
        }
        const result = await onVerifySignupCode(cleanEmail, code);
        if (!result.success) setErrorMsg(localizedMessage(result.message, 'কোডটি ভুল অথবা মেয়াদ শেষ হয়েছে। নতুন কোড নিন।', 'The code is invalid or has expired. Request a new code.'));
        else setInfoMsg(localizedMessage(result.message, 'ইমেইল যাচাই সফল হয়েছে। আপনার অ্যাকাউন্টে প্রবেশ করা হচ্ছে।', 'Email verified. Signing you in.'));
      } else if (mode === 'forgot') {
        const result = await onResetPassword(cleanEmail);
        if (!result.success) setErrorMsg(localizedMessage(result.message, 'কোড পাঠানো যায়নি। আবার চেষ্টা করুন।', 'Could not send the code. Please try again.'));
        else {
          setMode('verify');
          setOtp('');
          setInfoMsg(localizedMessage(result.message, 'আপনার ইমেইলে যাচাইকরণ কোড পাঠানো হয়েছে।', 'A verification code has been sent to your email.'));
        }
      } else if (mode === 'verify') {
        const code = otp.replace(/\D/g, '');
        if (!validOtp(code)) {
          setErrorMsg(tr('ইমেইলে পাওয়া সম্পূর্ণ কোডটি লিখুন (৬–১০ সংখ্যা)।', 'Enter the complete code from your email (6–10 digits).'));
          return;
        }
        const result = await onVerifyResetCode(cleanEmail, code);
        if (!result.success) setErrorMsg(localizedMessage(result.message, 'কোডটি সঠিক নয় অথবা মেয়াদ শেষ হয়েছে।', 'The code is invalid or has expired.'));
        else {
          setMode('reset');
          setPass('');
          setConfirmPass('');
          setInfoMsg(tr('কোড যাচাই হয়েছে। এখন নতুন পাসওয়ার্ড দিন।', 'Code verified. Set your new password.'));
        }
      } else if (mode === 'reset') {
        if (pass.length < 8) {
          setErrorMsg(tr('নতুন পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে।', 'New password must be at least 8 characters.'));
          return;
        }
        if (pass !== confirmPass) {
          setErrorMsg(tr('নতুন পাসওয়ার্ড দুটি মিলছে না।', 'The new passwords do not match.'));
          return;
        }
        const result = await onUpdatePassword(pass);
        if (!result.success) setErrorMsg(localizedMessage(result.message, 'পাসওয়ার্ড আপডেট করা যায়নি।', 'Could not update the password.'));
        else setInfoMsg(localizedMessage(result.message, 'পাসওয়ার্ড পরিবর্তন হয়েছে।', 'Your password has been updated.'));
      }
    } catch (error) {
      console.error('Authentication flow failed:', error);
      setErrorMsg(tr('একটি সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।', 'Something went wrong. Please try again shortly.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!cleanEmail || resending) return;
    setResending(true);
    clearMessages();
    try {
      const result = mode === 'signup-verify'
        ? await onResendSignupCode(cleanEmail)
        : await onResetPassword(cleanEmail);
      if (!result.success) setErrorMsg(localizedMessage(result.message, 'নতুন কোড পাঠানো যায়নি।', 'Could not send a new code.'));
      else setInfoMsg(tr('নতুন যাচাইকরণ কোড পাঠানোর অনুরোধ সফল হয়েছে।', 'A new verification code has been requested.'));
    } catch {
      setErrorMsg(tr('কোড পুনরায় পাঠানো যায়নি। আবার চেষ্টা করুন।', 'Could not resend the code. Please try again.'));
    } finally {
      setResending(false);
    }
  };

  const title: Record<AuthMode, string> = {
    login: tr('আপনার অ্যাকাউন্টে প্রবেশ করুন', 'Welcome back'),
    signup: tr('নতুন অ্যাকাউন্ট তৈরি করুন', 'Create your account'),
    'signup-verify': tr('ইমেইল যাচাই করুন', 'Verify your email'),
    forgot: tr('পাসওয়ার্ড রিসেট করুন', 'Reset your password'),
    verify: tr('ইমেইল কোড যাচাই করুন', 'Verify your email code'),
    reset: tr('নতুন পাসওয়ার্ড সেট করুন', 'Set a new password')
  };
  const subtitle: Record<AuthMode, string> = {
    login: tr('আপনার Embroidery ব্যবসার হিসাব নিরাপদে পরিচালনা করুন।', 'Sign in to manage your embroidery business workspace.'),
    signup: tr('আপনার ব্যবসার জন্য নিরাপদ Workspace তৈরি করুন।', 'Create a secure workspace for your business.'),
    'signup-verify': tr('আপনার Gmail-এ পাঠানো যাচাইকরণ কোড লিখুন।', 'Enter the verification code sent to your email.'),
    forgot: tr('আপনার অ্যাকাউন্টের ইমেইল দিন। আমরা যাচাইকরণ কোড পাঠাব।', 'Enter your account email. We will send a verification code.'),
    verify: tr('ইমেইলে পাওয়া সম্পূর্ণ কোডটি এখানে লিখুন।', 'Enter the complete code sent to your email.'),
    reset: tr('যাচাইকরণ সম্পন্ন হয়েছে। এখন নতুন পাসওয়ার্ড তৈরি করুন।', 'Verification complete. Create a new password.')
  };
  const buttonText: Record<AuthMode, string> = {
    login: tr('নিরাপদে লগ-ইন করুন', 'Sign in securely'),
    signup: tr('অ্যাকাউন্ট তৈরি করুন', 'Create account'),
    'signup-verify': tr('ইমেইল যাচাই করুন', 'Verify email'),
    forgot: tr('যাচাইকরণ কোড পাঠান', 'Send verification code'),
    verify: tr('কোড যাচাই করুন', 'Verify code'),
    reset: tr('নতুন পাসওয়ার্ড সংরক্ষণ করুন', 'Save new password')
  };

  const showEmail = mode !== 'reset';
  const showPasswordField = mode === 'login' || mode === 'signup' || mode === 'reset';

  return (
    <main className="auth-shell min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 font-sans">
      <div className="auth-ambient auth-ambient-one" aria-hidden="true" />
      <div className="auth-ambient auth-ambient-two" aria-hidden="true" />
      <div className="auth-grid" aria-hidden="true" />
      <div className="auth-layout relative z-10 w-full max-w-[480px]">
        <header className="auth-brand-enter mb-5 text-center">
          <div className="auth-logo-halo mx-auto mb-3">
            <img src="/embroidery-statement-logo.svg?v=1" alt="Embroidery Statement" className="auth-logo" fetchPriority="high" />
          </div>
          <div className="auth-wordmark">EMBROIDERY <span>STATEMENT</span></div>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400 sm:text-xs">BUSINESS MANAGEMENT WORKSPACE</p>
        </header>

        <section className="auth-panel auth-panel-enter relative rounded-[2rem] p-6 sm:p-8">
          <div className="auth-language-switch" role="group" aria-label="Choose language">
            <Languages className="h-4 w-4 text-blue-600" />
            <button type="button" onClick={() => setLanguage('en')} className={bn ? '' : 'active'} aria-pressed={!bn}>EN</button>
            <span aria-hidden="true" />
            <button type="button" onClick={() => setLanguage('bn')} className={bn ? 'active' : ''} aria-pressed={bn}>বাংলা</button>
          </div>

          <div key={mode} className={`auth-mode-content ${transitionPhase === 'out' ? 'is-exiting' : transitionPhase === 'in' ? 'is-entering' : ''} ${mode === 'signup' || mode === 'signup-verify' ? 'is-signup' : 'is-login'}`}>
          <div className="mb-6 pt-5 text-center">
            <div className="auth-icon mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl">
              {mode === 'verify' || mode === 'signup-verify' ? <KeyRound className="h-6 w-6" /> : mode === 'forgot' || mode === 'reset' ? <ShieldCheck className="h-6 w-6" /> : <LockKeyhole className="h-6 w-6" />}
            </div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">{tr('নিরাপদ ব্যবসায়িক অ্যাক্সেস', 'SECURE BUSINESS ACCESS')}</p>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-[1.85rem]">{title[mode]}</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{subtitle[mode]}</p>
          </div>

          {(mode === 'login' || mode === 'signup') && (
            <div className="auth-mode-switch mb-5 grid grid-cols-2 rounded-2xl p-1">
              <button type="button" onClick={() => switchMode('login')} className={mode === 'login' ? 'active' : ''}>{tr('লগ-ইন', 'Sign in')}</button>
              <button type="button" onClick={() => switchMode('signup')} className={mode === 'signup' ? 'active' : ''}>{tr('নতুন অ্যাকাউন্ট', 'Sign up')}</button>
            </div>
          )}

          {errorMsg && <div role="alert" className="auth-message auth-message-error mb-4 flex items-start gap-3 rounded-2xl p-3 text-sm font-semibold"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><span>{errorMsg}</span></div>}
          {infoMsg && <div role="status" className="auth-message auth-message-info mb-4 flex items-start gap-3 rounded-2xl p-3 text-sm font-semibold"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><span>{infoMsg}</span></div>}

          <form onSubmit={handleSubmit} className="auth-form-stage space-y-4">
            {mode === 'signup' && (
              <label className="auth-field block space-y-2">
                <span><Building2 className="inline h-4 w-4" /> {tr('ব্যবসার নাম', 'Business name')}</span>
                <input type="text" required autoComplete="organization" value={businessName} onChange={event => setBusinessName(event.target.value)} className="auth-input" placeholder={tr('যেমন: Emon Embroidery', 'e.g. Emon Embroidery')} />
              </label>
            )}

            {showEmail && (
              <label className="auth-field block space-y-2">
                <span><Mail className="inline h-4 w-4" /> {tr('ইমেইল ঠিকানা', 'Email address')}</span>
                <input type="email" required autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={email} readOnly={mode === 'verify' || mode === 'signup-verify'} onChange={event => setEmail(event.target.value)} className="auth-input" placeholder={tr('আপনার ইমেইল লিখুন', 'name@example.com')} />
              </label>
            )}

            {(mode === 'verify' || mode === 'signup-verify') && (
              <label className="auth-field block space-y-2">
                <span><KeyRound className="inline h-4 w-4" /> {tr('ইমেইল যাচাইকরণ কোড', 'Email verification code')}</span>
                <input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} required value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 10))} className="auth-input auth-otp-input text-center text-2xl font-black" placeholder="••••••••" />
              </label>
            )}

            {showPasswordField && (
              <>
                <label className="auth-field block space-y-2">
                  <span><LockKeyhole className="inline h-4 w-4" /> {mode === 'reset' ? tr('নতুন পাসওয়ার্ড', 'New password') : tr('পাসওয়ার্ড', 'Password')}</span>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} required minLength={mode === 'login' ? 6 : 8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={pass} onChange={event => setPass(event.target.value)} className="auth-input pr-12" placeholder={tr('আপনার পাসওয়ার্ড লিখুন', 'Enter your password')} />
                    <button type="button" className="auth-password-toggle" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? tr('পাসওয়ার্ড লুকান', 'Hide password') : tr('পাসওয়ার্ড দেখান', 'Show password')}>
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </label>
                {(mode === 'signup' || mode === 'reset') && (
                  <label className="auth-field block space-y-2">
                    <span><LockKeyhole className="inline h-4 w-4" /> {tr('পাসওয়ার্ড নিশ্চিত করুন', 'Confirm password')}</span>
                    <input type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={confirmPass} onChange={event => setConfirmPass(event.target.value)} className="auth-input" placeholder={tr('আবার পাসওয়ার্ড লিখুন', 'Re-enter your password')} />
                  </label>
                )}
              </>
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <button type="button" onClick={() => switchMode('forgot')} className="auth-link">{tr('পাসওয়ার্ড ভুলে গেছেন?', 'Forgot password?')}</button>
              </div>
            )}

            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> {tr('অপেক্ষা করুন...', 'Please wait...')}</> : <>{buttonText[mode]} <ArrowRight className="h-5 w-5" /></>}
            </button>
          </form>

          {(mode === 'verify' || mode === 'signup-verify') && (
            <button type="button" onClick={handleResendCode} disabled={resending || loading} className="auth-link mt-4 w-full text-center disabled:opacity-50">
              {resending ? tr('কোড পাঠানো হচ্ছে...', 'Sending code...') : tr('কোড পাননি? আবার পাঠান', 'Did not receive a code? Resend')}
            </button>
          )}

          <div className="mt-6 border-t border-slate-200/80 pt-5 text-center">
            {mode === 'reset' ? (
              <p className="text-xs font-semibold text-slate-500">{tr('নতুন পাসওয়ার্ড সংরক্ষণ হলে আপনি অ্যাপে প্রবেশ করতে পারবেন।', 'You can sign in after saving your new password.')}</p>
            ) : mode === 'forgot' || mode === 'verify' || mode === 'signup-verify' ? (
              <button type="button" onClick={() => switchMode('login')} className="auth-back-link"><ArrowLeft className="h-4 w-4" /> {tr('লগ-ইন-এ ফিরে যান', 'Back to sign in')}</button>
            ) : (
              <p className="text-xs font-medium text-slate-500">{tr('আপনার তথ্য এনক্রিপ্টেড ও সুরক্ষিত থাকে।', 'Your account information stays protected.')}</p>
            )}
          </div>
          </div>
        </section>

        <footer className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          {tr('নিরাপদ Supabase Authentication', 'Secure Supabase Authentication')}
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
        </footer>
      </div>
    </main>
  );
};

export default Auth;
