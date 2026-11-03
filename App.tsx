import React, { useState, useEffect, useCallback } from 'react';
import { Landmark, AlertTriangle } from 'lucide-react';
import { Party, Transaction, User, TabType } from './types';
import { dbService } from './services/supabaseService';
import { supabase, supabaseUrl } from './services/supabaseClient';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Ledger from './components/Ledger';
import Settings from './components/Settings';
import MonthlyReports from './components/MonthlyReports';
import MonthlyCollections from './components/MonthlyCollections';
import PartiesList from './components/PartiesList';
import { BiometricLock } from './components/BiometricLock';
import WorkerAttendance from './components/WorkerAttendance';
import SplashScreen from './components/SplashScreen';

const sendSMSAlert = async (phone: string, message: string) => {
  try {
    // Generic SMS gateway integration
    console.log(`[SMS Gateway] Sending SMS to ${phone}...`);
    console.log(`[SMS Gateway] Message: ${message}`);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Example implementation for a real API (e.g., Twilio, Nexmo, local providers):
    // const response = await fetch('https://api.smsgateway.com/v1/send', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer YOUR_API_KEY' },
    //   body: JSON.stringify({ to: phone, text: message })
    // });
    
    return { success: true, message: 'SMS sent successfully' };
  } catch (error) {
    console.error('SMS sending failed:', error);
    return { success: false, message: 'Failed to send SMS' };
  }
};


const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [parties, setParties] = useState<Party[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [loading, setLoading] = useState(true);
  const [splashComplete, setSplashComplete] = useState(false);
  const [isMisconfigured, setIsMisconfigured] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [isLocked, setIsLocked] = useState(() => localStorage.getItem('app_lock_enabled') === 'true');
  const [stats, setStats] = useState({
    totalCredit: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    monthlyWork: 0,
          monthlyCollected: 0
  });

  useEffect(() => {
    const splashTimer = window.setTimeout(() => setSplashComplete(true), 5000);
    return () => window.clearTimeout(splashTimer);
  }, []);

  const refreshData = useCallback(async () => {
    if (!user) return;
    try {
      const db = await dbService.getInitialData();
      setParties(db.parties);
                        setTransactions(db.transactions);

      // Only count non-deleted parties for stats
      const activePartiesIds = new Set(db.parties.filter(p => !p.is_deleted).map(p => p.id));
      const activeTransactions = db.transactions.filter(t => activePartiesIds.has(t.party_id));

      const totalCredit = activeTransactions.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
      const totalCollected = activeTransactions.reduce((sum, item) => sum + (Number(item.payment) || 0), 0);
      
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      const monthlyCollected = activeTransactions.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).reduce((sum, item) => sum + (Number(item.payment) || 0), 0);

      const monthlyWork = activeTransactions.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).reduce((sum, item) => sum + (Number(item.credit) || 0), 0);

      setStats({
        totalCredit,
        totalCollected,
        totalOutstanding: totalCredit - totalCollected,
        monthlyWork,
        monthlyCollected
      });
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const isPlaceholder = supabaseUrl.includes('placeholder-project.supabase.co');
    if (isPlaceholder) {
      setIsMisconfigured(true);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          business_name: session.user.user_metadata?.business_name || 'EMBROIDERY STATEMENT'
        });
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth Event:", event);
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true);
      }
      
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          business_name: session.user.user_metadata?.business_name || 'EMBROIDERY STATEMENT'
        });
      } else {
        setUser(null);
        setParties([]);
        setTransactions([]);
        setStats({
          totalCredit: 0,
          totalCollected: 0,
          totalOutstanding: 0,
          monthlyWork: 0,
          monthlyCollected: 0
        });
      }
    });

    return () => authSub.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !isMisconfigured) {
      refreshData();
      const channel = supabase
        .channel('db_changes')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          refreshData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, refreshData, isMisconfigured]);

  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && localStorage.getItem('app_lock_enabled') === 'true') {
        setIsLocked(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleLogin = async (e: string, p: string) => {
    const res = await dbService.login(e, p);
    if (res.success) setIsLocked(false);
    return res;
  };

  const handleSignup = async (e: string, p: string, b: string) => {
    const res = await dbService.signup(e, p, b);
    return res;
  };

  const handleVerifySignupCode = async (email: string, code: string) => {
    return await dbService.verifySignupCode(email, code);
  };

  const handleResendSignupCode = async (email: string) => {
    return await dbService.resendSignupCode(email);
  };

  const handleLogout = async () => {
    await dbService.logout();
    setUser(null);
  };

  const handleAddParty = async (name: string, phone: string) => {
    try {
      await dbService.addParty({ name, phone, is_deleted: false });
      await refreshData();
    } catch (err: any) {
      alert(`Error adding party: ${err.message || 'Unknown error'}`);
    }
  };

  const handleEditParty = async (id: string, updates: Partial<Party>) => {
    try {
      await dbService.updateParty(id, updates);
      await refreshData();
    } catch (err: any) {
      alert(`Error updating party: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteParty = async (id: string) => {
    // Soft delete to support Recycle Bin
    try {
      await dbService.updateParty(id, { is_deleted: true });
      if (selectedParty?.id === id) setSelectedParty(null);
      await refreshData();
    } catch (err: any) {
      alert(`Error moving party to trash: ${err.message || 'Unknown error'}`);
    }
  };

  const handleRestoreParty = async (id: string) => {
    try {
      await dbService.updateParty(id, { is_deleted: false });
      await refreshData();
    } catch (err: any) {
      alert(`Error restoring party: ${err.message || 'Unknown error'}`);
    }
  };

  const [partyToPermDelete, setPartyToPermDelete] = useState<string | null>(null);

  const handlePermanentDeleteParty = async (id: string) => {
    setPartyToPermDelete(id);
  };
  
  const confirmPermanentDeleteParty = async () => {
    if (!partyToPermDelete) return;
    try {
      await dbService.deleteParty(partyToPermDelete);
      await refreshData();
      setPartyToPermDelete(null);
    } catch (err: any) {
      alert(`Error permanently deleting party: ${err.message || 'Unknown error'}`);
    }
  };

  const handleAddTransaction = async (data: Omit<Transaction, 'id' | 'created_at'>) => {
    try {
      await dbService.addTransaction(data);
      await refreshData();
    } catch (err: any) {
      alert(`Error adding transaction: ${err.message || 'Unknown error'}`);
    }
  };

  const handleEditTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      await dbService.updateTransaction(id, updates);
      await refreshData();
    } catch (err: any) {
      alert(`Error updating transaction: ${err.message || 'Unknown error'}`);
    }
  };

  const [txToDelete, setTxToDelete] = useState<string | null>(null);

  const handleDeleteTransaction = async (id: string) => {
    setTxToDelete(id);
  };

  const confirmDeleteTransaction = async () => {
    if (!txToDelete) return;
    try {
      await dbService.deleteTransaction(txToDelete);
      await refreshData();
      setTxToDelete(null);
    } catch (err: any) {
      alert(`Error deleting transaction: ${err.message || 'Unknown error'}`);
    }
  };

  
  const handleUpdateProfile = async (email: string, biz: string) => {
    try {
      const updatedUser = await dbService.updateProfile(email, biz);
      setUser(updatedUser);
    } catch (err: any) {
      throw err;
    }
  };

  const handleResetPassword = async (email: string) => {
    return await dbService.resetPassword(email);
  };

  const handleVerifyResetCode = async (email: string, code: string) => {
    const result = await dbService.verifyResetCode(email, code);
    // Keep the Auth screen open for password creation only after the recovery OTP is valid.
    if (result.success) setIsResettingPassword(true);
    return result;
  };

  const handleUpdatePassword = async (newPass: string) => {
    const res = await dbService.updatePassword(newPass);
    if (res.success) setIsResettingPassword(false);
    return res;
  };

  if (!splashComplete) return <SplashScreen />;

  if (loading && !user && !isMisconfigured) {
    return (
      <SplashScreen />
    );
  }

  if (isMisconfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-rose-100 dark:border-rose-900/30 text-center">
          <div className="inline-flex p-5 bg-rose-50 dark:bg-rose-900/20 rounded-full mb-6">
            <AlertTriangle className="w-10 h-10 text-rose-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">Configuration Required</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
            The Supabase backend is not configured.
          </p>
        </div>
      </div>
    );
  }

  if (!user || isResettingPassword) {
    return (
      <Auth 
        onLogin={handleLogin} 
        onSignup={handleSignup} 
        onVerifySignupCode={handleVerifySignupCode}
        onResendSignupCode={handleResendSignupCode}
        onResetPassword={handleResetPassword}
        onVerifyResetCode={handleVerifyResetCode}
        onUpdatePassword={handleUpdatePassword}
        isResetting={isResettingPassword}
      />
    );
  }

  if (user && isLocked) {
    return <BiometricLock onUnlock={() => setIsLocked(false)} onLogout={handleLogout} />;
  }

  return (
    <div className="app-shell flex h-[100dvh] min-h-[100svh] w-full max-w-full overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        parties={parties}
        selectedParty={selectedParty}
        setSelectedParty={setSelectedParty}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onLogout={handleLogout}
        onAddParty={handleAddParty}
        onEditParty={handleEditParty}
        onDeleteParty={handleDeleteParty}
        onRestoreParty={handleRestoreParty}
        onPermanentDeleteParty={handlePermanentDeleteParty}
      />

      <main className="app-main min-w-0 w-full max-w-full flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-10 no-print">
        {activeTab === 'workers' && <WorkerAttendance userId={user.id} companyName={user.business_name} />}
        {activeTab === 'dashboard' && <Dashboard stats={stats} user={user} parties={parties} transactions={transactions} setActiveTab={setActiveTab} setSelectedParty={setSelectedParty} />}
        {activeTab === 'parties' && <PartiesList parties={parties} transactions={transactions} setActiveTab={setActiveTab} setSelectedParty={setSelectedParty} onAddParty={handleAddParty} />}
        {activeTab === 'ledger' && (
          <Ledger 
            setActiveTab={setActiveTab}
            parties={parties} 
            selectedParty={selectedParty} 
            transactions={selectedParty ? transactions.filter(t => t.party_id === selectedParty.id) : []}
            user={user}
            onAddTransaction={handleAddTransaction}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onSendSMS={sendSMSAlert}
          />
        )}
        {activeTab === 'monthly_reports' && <MonthlyReports setActiveTab={setActiveTab} transactions={transactions} parties={parties} />}
        {activeTab === 'monthly_collections' && <MonthlyCollections setActiveTab={setActiveTab} transactions={transactions} parties={parties} />}
        {activeTab === 'settings' && (
          <Settings 
            user={user}
            onUpdateProfile={handleUpdateProfile}
          />
        )}
        {['sales', 'expenses'].includes(activeTab) && (
          <div className="h-full flex flex-col items-center justify-center text-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800">
             <Landmark className="w-12 h-12 text-slate-300 mb-6" />
             <h2 className="text-xl font-black uppercase tracking-widest text-slate-400">Coming Soon</h2>
          </div>
        )}
      </main>

      <div className="hidden print:block fixed inset-0 bg-white z-[100] p-0 overflow-visible">
         {activeTab === 'ledger' && selectedParty && (
           <Ledger 
              parties={parties} 
              selectedParty={selectedParty} 
              transactions={transactions.filter(t => t.party_id === selectedParty.id)}
              user={user}
              onAddTransaction={handleAddTransaction}
              onEditTransaction={handleEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onSendSMS={sendSMSAlert}
            />
         )}
      </div>
      
      
      {partyToPermDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xs w-full text-center animate-in zoom-in-95">
            <h4 className="text-lg font-black uppercase tracking-tight mb-2 text-rose-600">Delete Permanently?</h4>
            <p className="text-[11px] font-bold text-slate-500 mb-8 leading-relaxed">
              This action cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setPartyToPermDelete(null)} className="py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-all">Cancel</button>
              <button onClick={confirmPermanentDeleteParty} className="py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-500/20 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      {txToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xs w-full text-center animate-in zoom-in-95">
            <h4 className="text-lg font-black uppercase tracking-tight mb-2 text-rose-600">Delete Transaction?</h4>
            <p className="text-[11px] font-bold text-slate-500 mb-8 leading-relaxed">
              Are you sure you want to delete this record?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setTxToDelete(null)} className="py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-all">Cancel</button>
              <button onClick={confirmDeleteTransaction} className="py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-500/20 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;