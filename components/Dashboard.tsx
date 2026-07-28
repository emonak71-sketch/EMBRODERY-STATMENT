import React, { useState, useMemo } from 'react';
import { Landmark, TrendingUp, TrendingDown, Package, CreditCard, Wallet, Users, ArrowLeft, ChevronRight } from 'lucide-react';
import { User, Party, Transaction, TabType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface Stats {
  totalCredit: number;
  totalCollected: number;
  totalOutstanding: number;
  monthlyWork: number;
}

const Dashboard: React.FC<{ 
  stats: Stats; 
  user: User | null;
  parties?: Party[];
  transactions?: Transaction[];
  setActiveTab?: (tab: TabType) => void;
  setSelectedParty?: (party: Party) => void;
}> = ({ stats, user, parties = [], transactions = [], setActiveTab, setSelectedParty }) => {
  const { t } = useLanguage();
  
  const [viewMode, setViewMode] = useState<'overview' | 'outstanding' | 'collected' | 'collected_party'>('overview');
  const [selectedCollectedPartyId, setSelectedCollectedPartyId] = useState<string | null>(null);

  // Calculate outstanding per party and sort descending
  const outstandingParties = useMemo(() => {
    return parties.map(p => {
      const txs = transactions.filter(tx => tx.party_id === p.id);
      const credit = txs.reduce((sum, tx) => sum + (Number(tx.credit) || 0), 0);
      const payment = txs.reduce((sum, tx) => sum + (Number(tx.payment) || 0), 0);
      return { ...p, balance: credit - payment };
    }).filter(p => p.balance > 0).sort((a, b) => b.balance - a.balance);
  }, [parties, transactions]);

  // Calculate collected per party and sort descending
  const collectedParties = useMemo(() => {
    return parties.map(p => {
      const txs = transactions.filter(tx => tx.party_id === p.id);
      const payment = txs.reduce((sum, tx) => sum + (Number(tx.payment) || 0), 0);
      return { ...p, totalPayment: payment };
    }).filter(p => p.totalPayment > 0).sort((a, b) => b.totalPayment - a.totalPayment);
  }, [parties, transactions]);

  // Payments for selected party
  const partyPayments = useMemo(() => {
    if (!selectedCollectedPartyId) return [];
    return transactions
      .filter(tx => tx.party_id === selectedCollectedPartyId && (Number(tx.payment) || 0) > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCollectedPartyId, transactions]);

  const cards = [
    { 
      title: t('total_outstanding'), 
      amount: stats.totalOutstanding, 
      icon: <CreditCard className="w-5 h-5 text-rose-500" />,
      color: 'bg-rose-50 dark:bg-rose-900/10',
      isDynamic: true,
      onClick: () => setViewMode('outstanding')
    },
    { 
      title: t('total_collected'), 
      amount: stats.totalCollected, 
      icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
      color: 'bg-emerald-50 dark:bg-emerald-900/10',
      isDynamic: false,
      onClick: () => setViewMode('collected')
    },
    { 
      title: t('net_receivables'), 
      amount: stats.totalCredit - stats.totalCollected, 
      icon: <Landmark className="w-5 h-5 text-indigo-500" />,
      color: 'bg-indigo-50 dark:bg-indigo-900/10',
      isDynamic: true
    },
    {
      title: t('monthly_work'),
      amount: stats.monthlyWork,
      icon: <Wallet className="w-5 h-5 text-amber-500" />,
      color: 'bg-amber-50 dark:bg-amber-900/10',
      isDynamic: false,
      onClick: () => { if (setActiveTab) setActiveTab('monthly_reports'); }
    },
    {
      title: t('total_parties'),
      amount: parties.length,
      icon: <Users className="w-5 h-5 text-purple-500" />,
      color: 'bg-purple-50 dark:bg-purple-900/10',
      isDynamic: false,
      onClick: () => { if (setActiveTab) setActiveTab('parties'); }
    }
  ];

  if (viewMode === 'outstanding') {
    return (
      <div className="space-y-6 pt-14 md:pt-0 animate-in fade-in">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setViewMode('overview')}
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
              {t('total_outstanding')}
            </h1>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {outstandingParties.map((p) => (
              <div key={p.id} className="flex justify-between items-center p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">{p.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">{p.phone || 'No phone number'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-rose-600">৳{p.balance.toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
            {outstandingParties.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm font-bold">{t('no_outstanding_balances')}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'collected') {
    return (
      <div className="space-y-6 pt-14 md:pt-0 animate-in fade-in">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setViewMode('overview')}
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
              {t('total_collected')}
            </h1>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {collectedParties.map((p) => (
              <button 
                key={p.id} 
                onClick={() => {
                  setSelectedCollectedPartyId(p.id);
                  setViewMode('collected_party');
                }}
                className="w-full flex justify-between items-center p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
              >
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">{p.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">{p.phone || 'No phone number'}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-black text-emerald-600">৳{p.totalPayment.toLocaleString('en-IN')}</p>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>
              </button>
            ))}
            {collectedParties.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm font-bold">{t('no_collections_found')}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'collected_party') {
    const p = parties.find(p => p.id === selectedCollectedPartyId);
    return (
      <div className="space-y-6 pt-14 md:pt-0 animate-in fade-in">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setViewMode('collected')}
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
              {p?.name} - Payments
            </h1>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {partyPayments.map((tx) => (
              <div key={tx.id} className="flex justify-between items-center p-5">
                <div>
                  <p className="text-xs font-bold text-slate-400 mb-1">{tx.date}</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{tx.details || t('payment_received')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-600">৳{Number(tx.payment).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
            {partyPayments.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm font-bold">No payments recorded.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-14 md:pt-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-in fade-in slide-in-from-left-8 duration-700 ease-out">
        <div>
          <div className="text-[9px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-[0.3em] mb-1 px-1">
            {user?.business_name || 'EMBRODERY STATEMENT'}
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
            {t('overview')}
          </h1>
        </div>
        <div className="px-4 py-2 bg-white dark:bg-slate-900 rounded-xl shadow-lg shadow-black/5 border border-slate-200 dark:border-slate-800 flex flex-col items-end animate-in fade-in slide-in-from-right-8 duration-700 delay-100">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Last Update</span>
          <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
            {new Date().toLocaleDateString('en-GB')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => {
          const isNegative = card.isDynamic && card.amount < 0;
          const isPositive = card.isDynamic && card.amount > 0;
          
          return (
            <div 
              key={i}
              onClick={(card as any).onClick}
              className={`bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:-translate-y-1 hover:shadow-xl animate-in zoom-in-95 fade-in duration-500 ${(card as any).onClick ? 'cursor-pointer' : ''}`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`${card.color} p-3 rounded-lg`}>
                  {card.icon}
                </div>
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.title}</p>
                <h2 className={`text-xl font-black tracking-tight ${isNegative ? 'text-emerald-600' : isPositive ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                  {card.title === t('total_parties') ? card.amount : `৳${card.amount.toLocaleString('en-IN')}`}
                </h2>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
