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

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [parties, setParties] = useState<Party[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [loading, setLoading] = useState(true);
  const [isMisconfigured, setIsMisconfigured] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [dataError, setDataError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalCredit: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    monthlyWork: 0,
          monthlyCollected: 0
  });

  const refreshData = useCallback(async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      const db = await dbService.getInitialData();
      // Update the UI only after both core tables have loaded successfully.
      // A network/schema error must never make existing records appear deleted.
      setParties(db.parties);
      setTransactions(db.transactions);
      setDataError(null);

      const activePartiesIds = new Set(db.parties.filter(p => !p.is_deleted).map(p => p.id));
      const activeTransactions = db.transactions.filter(t => activePartiesIds.has(t.party_id));
      const totalCredit = activeTransactions.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
      const totalCollected = activeTransactions.reduce((sum, item) => sum + (Number(item.payment) || 0), 0);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const thisMonth = activeTransactions.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return !Number.isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      setStats({
        totalCredit,
        totalCollected,
        totalOutstanding: totalCredit - totalCollected,
        monthlyWork: thisMonth.reduce((sum, item) => sum + (Number(item.credit) || 0), 0),
        monthlyCollected: thisMonth.reduce((sum, item) => sum + (Number(item.payment) || 0), 0)
      });
    } catch (err) {
      console.error('Failed to fetch workspace data:', err);
      setDataError(err instanceof Error ? err.message : 'ডেটা লোড করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
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
        setDataError(null);
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
    return res;
  };

  const handleSignup = async (e: string, p: string, b: string) => {
    const res = await dbService.signup(e, p, b);
    return res;
  };

  const handleLogout = async () => {
    await dbService.logout();
    setUser(null);
  };

  const handleAddParty = async (name: string, phone: string) => {
    await dbService.addParty({ name, phone, is_deleted: false });
    await refreshData();
  };

  const handleEditParty = async (id: string, updates: Partial<Party>) => {
    await dbService.updateParty(id, updates);
    await refreshData();
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
    await dbService.addTransaction(data);
    await refreshData();
  };

  const handleEditTransaction = async (id: string, updates: Partial<Transaction>) => {
    await dbService.updateTransaction(id, updates);
    await refreshData();
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
    // Only reveal the new-password form after Supabase confirms the OTP.
    if (result.success) setIsResettingPassword(true);
    return result;
  };

  const handleUpdatePassword = async (newPass: string) => {
    const res = await dbService.updatePassword(newPass);
    if (res.success) setIsResettingPassword(false);
    return res;
  };

  if (loading && !user && !isMisconfigured) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
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
        onResetPassword={handleResetPassword}
        onVerifyResetCode={handleVerifyResetCode}
        onUpdatePassword={handleUpdatePassword}
        isResetting={isResettingPassword}
      />
    );
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
        {dataError && (
          <div role="alert" className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-900 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-extrabold">ডেটা লোড করা যায়নি — আপনার পুরোনো রেকর্ড মুছে যায়নি।</p>
              <p className="mt-1 text-xs opacity-80">সংযোগ ঠিক হলে আবার চেষ্টা করুন। {dataError}</p>
            </div>
            <button type="button" onClick={() => void refreshData()} disabled={isRefreshing} className="shrink-0 rounded-xl bg-amber-900 px-4 py-2.5 text-xs font-black text-white transition hover:bg-amber-800 disabled:opacity-60 dark:bg-amber-200 dark:text-amber-950">
              {isRefreshing ? 'লোড হচ্ছে…' : 'আবার চেষ্টা করুন'}
            </button>
          </div>
        )}
        {activeTab === 'dashboard' && <Dashboard stats={stats} user={user} parties={parties.filter(p => !p.is_deleted)} transactions={transactions} setActiveTab={setActiveTab} setSelectedParty={setSelectedParty} />}
        {activeTab === 'parties' && <PartiesList parties={parties.filter(p => !p.is_deleted)} transactions={transactions} setActiveTab={setActiveTab} setSelectedParty={setSelectedParty} onAddParty={handleAddParty} />}
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
          />
        )}
        {activeTab === 'monthly_reports' && <MonthlyReports setActiveTab={setActiveTab} transactions={transactions} parties={parties.filter(p => !p.is_deleted)} />}
        {activeTab === 'monthly_collections' && <MonthlyCollections setActiveTab={setActiveTab} transactions={transactions} parties={parties.filter(p => !p.is_deleted)} />}
        {activeTab === 'settings' && (
          <Settings
            setActiveTab={setActiveTab}
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