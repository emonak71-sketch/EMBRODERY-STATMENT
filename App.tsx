import React, { useState, useEffect, useCallback } from 'react';
import { Landmark, AlertTriangle } from 'lucide-react';
import { Party, Transaction, Product, Expense, Sale, User, TabType } from './types';
import { dbService } from './services/supabaseService';
import { supabase, supabaseUrl } from './services/supabaseClient';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Ledger from './components/Ledger';
import Inventory from './components/Inventory';
import Settings from './components/Settings';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [parties, setParties] = useState<Party[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMisconfigured, setIsMisconfigured] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [stats, setStats] = useState({
    totalCredit: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    totalSales: 0,
    totalExpenses: 0,
    inventoryValue: 0
  });

  const refreshData = useCallback(async () => {
    if (!user) return;
    try {
      const db = await dbService.getInitialData();
      setParties(db.parties);
      setProducts(db.products);
      setSales(db.sales);
      setExpenses(db.expenses);
      setTransactions(db.transactions);

      // Only count non-deleted parties for stats
      const activePartiesIds = new Set(db.parties.filter(p => !p.is_deleted).map(p => p.id));
      const activeTransactions = db.transactions.filter(t => activePartiesIds.has(t.party_id));

      const totalCredit = activeTransactions.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
      const totalCollected = activeTransactions.reduce((sum, item) => sum + (Number(item.payment) || 0), 0);
      const totalSales = db.sales.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0);
      const totalExpenses = db.expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const inventoryValue = db.products.reduce((sum, item) => sum + ((Number(item.buying_price) || 0) * (Number(item.stock) || 0)), 0);

      setStats({
        totalCredit,
        totalCollected,
        totalOutstanding: totalCredit - totalCollected,
        totalSales,
        totalExpenses,
        inventoryValue
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
          business_name: session.user.user_metadata?.business_name || 'EMBRODERY STATEMENT'
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
          business_name: session.user.user_metadata?.business_name || 'EMBRODERY STATEMENT'
        });
      } else {
        setUser(null);
        setParties([]);
        setTransactions([]);
        setProducts([]);
        setStats({
          totalCredit: 0,
          totalCollected: 0,
          totalOutstanding: 0,
          totalSales: 0,
          totalExpenses: 0,
          inventoryValue: 0
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
    } else {
      document.documentElement.classList.remove('dark');
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

  const handlePermanentDeleteParty = async (id: string) => {
    if (!confirm('This will permanently delete this party and all transactions. This action cannot be undone.')) return;
    try {
      await dbService.deleteParty(id);
      await refreshData();
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

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Delete this transaction record?')) return;
    try {
      await dbService.deleteTransaction(id);
      await refreshData();
    } catch (err: any) {
      alert(`Error deleting transaction: ${err.message || 'Unknown error'}`);
    }
  };

  const handleAddProduct = async (p: Omit<Product, 'id'>) => {
    try {
      await dbService.addProduct(p);
      await refreshData();
    } catch (err: any) {
      alert(`Error adding product: ${err.message || 'Unknown error'}`);
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
        onUpdatePassword={handleUpdatePassword}
        isResetting={isResettingPassword}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
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

      <main className="flex-1 overflow-y-auto p-4 md:p-10 no-print">
        {activeTab === 'dashboard' && <Dashboard stats={stats} user={user} />}
        {activeTab === 'ledger' && (
          <Ledger 
            parties={parties} 
            selectedParty={selectedParty} 
            transactions={selectedParty ? transactions.filter(t => t.party_id === selectedParty.id) : []}
            user={user}
            onAddTransaction={handleAddTransaction}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}
        {activeTab === 'inventory' && (
          <Inventory 
            products={products}
            onAddProduct={handleAddProduct}
          />
        )}
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
            />
         )}
      </div>
    </div>
  );
};

export default App;