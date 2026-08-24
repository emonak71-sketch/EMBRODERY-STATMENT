import React, { useState, useEffect } from 'react';
import { Fingerprint, Lock, AlertCircle } from 'lucide-react';

export const BiometricLock = ({ onUnlock, onLogout }: { onUnlock: () => void, onLogout: () => void }) => {
  const [error, setError] = useState<string | null>(null);
  
  const handleUnlock = async () => {
    try {
      setError(null);
      const credId = localStorage.getItem('biometric_id');
      if (!credId) {
        setError('Biometrics not set up properly.');
        return;
      }
      
      const buffer = Uint8Array.from(atob(credId), c => c.charCodeAt(0));
      
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32), // Dummy challenge
          allowCredentials: [{
            id: buffer,
            type: 'public-key',
            transports: ['internal']
          }],
          userVerification: 'required'
        }
      });
      
      if (assertion) {
        onUnlock();
      }
    } catch (e) {
      console.error(e);
      setError('লক খুলতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন। (Failed to unlock)');
    }
  };

  useEffect(() => {
    handleUnlock();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="text-center space-y-6 w-full max-w-xs">
        <div className="inline-flex p-5 bg-primary-100 dark:bg-primary-900/30 rounded-full text-primary-600 animate-pulse">
          <Lock className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-wider">অ্যাপ লক</h2>
        <p className="text-slate-500 font-bold">অ্যাক্সেস করতে আপনার ফেস/ফিঙ্গারপ্রিন্ট বা পিন ব্যবহার করুন</p>
        
        {error && (
          <div className="p-3 bg-red-100 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" /> {error}
          </div>
        )}
        
        <button onClick={handleUnlock} className="w-full flex items-center justify-center gap-3 bg-primary-600 hover:bg-primary-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all">
          <Fingerprint className="w-6 h-6" /> আনলক করুন
        </button>
        
        <button onClick={onLogout} className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 uppercase tracking-widest mt-8">
          লগ-আউট করুন
        </button>
      </div>
    </div>
  );
};

export const setupBiometrics = async (userEmail: string) => {
  try {
    if (!window.PublicKeyCredential) {
      alert('আপনার ডিভাইসে বায়োমেট্রিক সাপোর্ট নেই (Biometrics not supported).');
      return false;
    }

    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: new Uint8Array(32),
        rp: { name: "Business App" },
        user: {
          id: new Uint8Array(16),
          name: userEmail,
          displayName: userEmail
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, 
          { alg: -257, type: "public-key" }
        ],
        authenticatorSelection: { 
          authenticatorAttachment: "platform", 
          userVerification: "required" 
        },
        timeout: 60000,
        attestation: "none"
      }
    });
    
    if (cred) {
      const idBase64 = btoa(String.fromCharCode.apply(null, new Uint8Array((cred as any).rawId) as any));
      localStorage.setItem('biometric_id', idBase64);
      localStorage.setItem('app_lock_enabled', 'true');
      return true;
    }
  } catch (e: any) {
    console.error(e);
    if (e.name === 'NotAllowedError') {
      alert('বায়োমেট্রিক লক বাতিল করা হয়েছে।');
    }
    return false;
  }
  return false;
};
