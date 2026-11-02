import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
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
import JobOrders from './components/JobOrders';
import Production from './components/Production';
import { BiometricLock } from './components/BiometricLock';

const sendWhatsAppAlert = async (phone: string, message: string) => {
  const digits = phone.replace(/\D/g, '');
  const internationalPhone = digits.startsWith('0') ? `88${digits}` : digits;
  if (!/^\d{10,15}$/.test(internationalPhone)) {
    return { success: false, message: 'সঠিক আন্তর্জাতিক ফোন নম্বর দিন (যেমন 8801XXXXXXXXX)।' };
  }

  const link = document.createElement('a');
  link.href = `https://wa.me/${internationalPhone}?text=${encodeURIComponent(message)}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
  return { success: true, message: 'WhatsApp খুলেছে। মেসেজটি দেখে Send চাপুন।' };
};

const emptyStats = {
  totalCredit: 0,
  totalCollected: 0,
  totalOutstanding: 0,
  monthlyWork: 0,
  monthlyCollected: 0,
  totalPcs: 0,
  totalOrders: 0
};

const parseLocalDate = (value: string) => {
  const parts = value.split('-').map(Number);
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(value);
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [parties, setParties] = useState<Party[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isMisconfigured, setIsMisconfigured] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isLocked, setIsLocked] = useState(() => localStorage.getItem('app_lock_enabled') === 'true');
  const [stats, setStats] = useState(emptyStats);
  const [partyToPermDelete, setPartyToPermDelete] = useState<string | null>(null);
  const [txToDelete, setTxToDelete] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    if (!user) return;
    try {
      setDataError(null);
      const db = await dbService.getInitialData();
      const nextParties = (db.parties || []) as Party[];
      const nextTransactions = (db.transactions || []) as Transaction[];
      setParties(nextParties);
      setTransactions(nextTransactions);

      const activePartyIds = new Set(nextParties.filter(party => !party.is_deleted).map(party => party.id));
      const activeTransactions = nextTransactions.filter(transaction => activePartyIds.has(transaction.party_id));
      const totalCredit = activeTransactions.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
      const totalCollected = activeTransactions.reduce((sum, item) => sum + (Number(item.payment) || 0), 0);
      const totalPcs = activeTransactions.reduce((sum, item) => sum + (Number(item.pcs) || 0), 0);
      const totalOrders = activeTransactions.filter(item => Number(item.credit) > 0).length;

      const now = new Date();
      const monthlyTransactions = activeTransactions.filter(transaction => {
        if (!transaction.date) return false;
        const date = parseLocalDate(transaction.date);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      });

      const monthlyCollected = monthlyTransactions.reduce((sum, item) => sum + (Number(item.payment) || 0), 0);
      const monthlyWork = monthlyTransactions.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);

      setStats({
        totalCredit,
        totalCollected,
        totalOutstanding: totalCredit - totalCollected,
        monthlyWork,
        monthlyCollected,
        totalPcs,
        totalOrders
      });
    } catch (error: any) {
      console.error('Failed to load business data:', error);
      setDataError(error?.message || 'ডেটাবেস থেকে তথ্য লোড করা যায়নি।');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!supabaseUrl || supabaseUrl.includes('placeholder-project.supabase.co')) {
      setIsMisconfigured(true);
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;
        if (error) {
          console.error('Session restore failed:', error);
          setLoading(false);
          return;
        }
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            business_name: session.user.user_metadata?.business_name || 'EMBROIDERY STATEMENT'
          });
        } else {
          setLoading(false);
        }
      })
      .catch(error => {
        console.error('Session restore failed:', error);
        if (mounted) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setIsResettingPassword(true);

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          business_name: session.user.user_metadata?.business_name || 'EMBROIDERY STATEMENT'
        });
      } else {
        setUser(null);
        setParties([]);
        setTransactions([]);
        setStats(emptyStats);
        if (event === 'SIGNED_OUT') setIsResettingPassword(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user || isMisconfigured) return;
    refreshData();
    const channel = supabase
      .channel(`db_changes_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public' }, () => refreshData())
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [user, refreshData, isMisconfigured]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && localStorage.getItem('app_lock_enabled') === 'true') setIsLocked(true);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleLogin = async (email: string, password: string) => {
    const result = await dbService.login(email, password);
    if (result.success) setIsLocked(false);
    return result;
  };

  const handleSignup = async (email: string, password: string, businessName: string) => dbService.signup(email, password, businessName);

  const handleLogout = async () => {
    try {
      await dbService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
      alert('লগ-আউট সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।');
      return;
    }
    setIsResettingPassword(false);
    setIsLocked(false);
    setUser(null);
  };

  const handleAddParty = async (name: string, phone: string) => {
    try {
      await dbService.addParty({ name: name.trim(), phone: phone.trim(), is_deleted: false });
      await refreshData();
    } catch (error: any) {
      alert(`পার্টি যোগ করা যায়নি: ${error.message || 'Unknown error'}`);
      throw error;
    }
  };

  const handleEditParty = async (id: string, updates: Partial<Party>) => {
    try {
      await dbService.updateParty(id, updates);
      await refreshData();
    } catch (error: any) {
      alert(`পার্টির তথ্য আপডেট করা যায়নি: ${error.message || 'Unknown error'}`);
      throw error;
    }
  };

  const handleDeleteParty = async (id: string) => {
    try {
      await dbService.updateParty(id, { is_deleted: true });
      if (selectedParty?.id === id) setSelectedParty(null);
      await refreshData();
    } catch (error: any) {
      alert(`পার্টি Trash-এ নেওয়া যায়নি: ${error.message || 'Unknown error'}`);
      throw error;
    }
  };

  const handleRestoreParty = async (id: string) => {
    try {
      await dbService.updateParty(id, { is_deleted: false });
      await refreshData();
    } catch (error: any) {
      alert(`পার্টি Restore করা যায়নি: ${error.message || 'Unknown error'}`);
      throw error;
    }
  };

  const handlePermanentDeleteParty = async (id: string) => {
    if (transactions.some(transaction => transaction.party_id === id)) {
      alert('এই কাস্টমারের Ledger-এ লেনদেন আছে। হিসাবের ইতিহাস অক্ষত রাখতে পার্টিটি স্থায়ীভাবে মুছে ফেলা যাবে না।');
      return;
    }
    setPartyToPermDelete(id);
  };

  const confirmPermanentDeleteParty = async () => {
    if (!partyToPermDelete) return;
    try {
      await dbService.deleteParty(partyToPermDelete);
      await refreshData();
      setPartyToPermDelete(null);
    } catch (error: any) {
      alert(`পার্টি স্থায়ীভাবে মুছতে সমস্যা হয়েছে: ${error.message || 'Unknown error'}`);
    }
  };

  const handleAddTransaction = async (data: Omit<Transaction, 'id' | 'created_at'>) => {
    try {
      await dbService.addTransaction(data);
      await refreshData();
    } catch (error: any) {
      alert(`লেনদেন সংরক্ষণ করা যায়নি: ${error.message || 'Unknown error'}`);
      throw error;
    }
  };

  const handleEditTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      await dbService.updateTransaction(id, updates);
      await refreshData();
    } catch (error: any) {
      alert(`লেনদেন আপডেট করা যায়নি: ${error.message || 'Unknown error'}`);
      throw error;
    }
  };

  const handleDeleteTransaction = async (id: string) => setTxToDelete(id);

  const confirmDeleteTransaction = async () => {
    if (!txToDelete) return;
    try {
      await dbService.deleteTransaction(txToDelete);
      await refreshData();
      setTxToDelete(null);
    } catch (error: any) {
      alert(`লেনদেন মুছতে সমস্যা হয়েছে: ${error.message || 'Unknown error'}`);
    }
  };

  const handleUpdateProfile = async (email: string, businessName: string) => {
    const updatedUser = await dbService.updateProfile(email, businessName);
    setUser(updatedUser);
  };

  const handleResetPassword = async (email: string) => dbService.resetPassword(email);

  const handleVerifyResetCode = async (email: string, code: string) => {
    setIsResettingPassword(true);
    try {
      const result = await dbService.verifyResetCode(email, code);
      if (!result.success) setIsResettingPassword(false);
      return result;
    } catch (error) {
      setIsResettingPassword(false);
      throw error;
    }
  };

  const handleUpdatePassword = async (newPassword: string) => {
    const result = await dbService.updatePassword(newPassword);
    if (result.success) setIsResettingPassword(false);
    return result;
  };

  if (loading && !user && !isMisconfigured) {
    return <div className="app-loading-screen"><div className="loading-orb" /><p>Embroidery Statement চালু হচ্ছে…</p></div>;
  }

  if (isMisconfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="glass-panel max-w-md w-full p-9 text-center">
          <AlertTriangle className="mx-auto mb-5 h-12 w-12 text-rose-500" />
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Configuration Required</h1>
          <p className="text-slate-600 dark:text-slate-300">Supabase backend configuration is missing.</p>
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

  if (user && isLocked) return <BiometricLock onUnlock={() => setIsLocked(false)} onLogout={handleLogout} />;

  return (
    <div className="app-shell flex h-[100dvh] min-h-[100svh] w-full max-w-full overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        parties={parties}
        selectedParty={selectedParty}
        setSelectedParty={setSelectedParty}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(value => !value)}
        onLogout={handleLogout}
        onAddParty={handleAddParty}
        onEditParty={handleEditParty}
        onDeleteParty={handleDeleteParty}
        onRestoreParty={handleRestoreParty}
        onPermanentDeleteParty={handlePermanentDeleteParty}
      />

      <main className="app-main min-w-0 w-full max-w-full flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 no-print">
        {dataError && (
          <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            <span>{dataError}</span>
            <button type="button" onClick={refreshData} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-rose-700 shadow-sm dark:bg-slate-900 dark:text-rose-300"><RefreshCw className="h-4 w-4" /> আবার চেষ্টা করুন</button>
          </div>
        )}

        {activeTab === 'dashboard' && <Dashboard stats={stats} user={user} parties={parties} transactions={transactions} setActiveTab={setActiveTab} setSelectedParty={setSelectedParty} />}
        {activeTab === 'parties' && <PartiesList parties={parties} transactions={transactions} setActiveTab={setActiveTab} setSelectedParty={setSelectedParty} onAddParty={handleAddParty} />}
        {activeTab === 'job_orders' && <JobOrders parties={parties} transactions={transactions} setActiveTab={setActiveTab} setSelectedParty={setSelectedParty} />}
        {activeTab === 'production' && <Production parties={parties} transactions={transactions} />}
        {activeTab === 'ledger' && (
          <Ledger
            setActiveTab={setActiveTab}
            parties={parties}
            selectedParty={selectedParty}
            transactions={selectedParty ? transactions.filter(transaction => transaction.party_id === selectedParty.id) : []}
            user={user}
            onAddTransaction={handleAddTransaction}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onSendAlert={sendWhatsAppAlert}
          />
        )}
        {activeTab === 'monthly_reports' && <MonthlyReports setActiveTab={setActiveTab} transactions={transactions} parties={parties} />}
        {activeTab === 'monthly_collections' && <MonthlyCollections setActiveTab={setActiveTab} transactions={transactions} parties={parties} />}
        {activeTab === 'settings' && <Settings user={user} onUpdateProfile={handleUpdateProfile} />}
        {['sales', 'expenses'].includes(activeTab) && (
          <div className="glass-panel empty-state">
            <AlertTriangle className="h-10 w-10 text-slate-400" />
            <strong>এই মডিউলটি এখনো সক্রিয় নয়</strong>
            <span>Sales ও Expenses মডিউল পরবর্তী রিলিজে যোগ করা হবে।</span>
          </div>
        )}
      </main>

      {partyToPermDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 modal-backdrop">
          <div className="glass-modal w-full max-w-sm p-7 text-center">
            <h4 className="text-xl font-black text-rose-600 mb-2">স্থায়ীভাবে মুছবেন?</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-7">এই কাজটি ফিরিয়ে আনা যাবে না।</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setPartyToPermDelete(null)} className="secondary-action justify-center">বাতিল</button>
              <button type="button" onClick={confirmPermanentDeleteParty} className="danger-action">স্থায়ীভাবে মুছুন</button>
            </div>
          </div>
        </div>
      )}

      {txToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 modal-backdrop">
          <div className="glass-modal w-full max-w-sm p-7 text-center">
            <h4 className="text-xl font-black text-rose-600 mb-2">লেনদেন মুছবেন?</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-7">এই লেনদেনটি স্থায়ীভাবে মুছে যাবে।</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setTxToDelete(null)} className="secondary-action justify-center">বাতিল</button>
              <button type="button" onClick={confirmDeleteTransaction} className="danger-action">মুছে ফেলুন</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
