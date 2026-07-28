
import React from 'react';
import { Landmark, TrendingUp, TrendingDown, Package, CreditCard, Wallet, Users } from 'lucide-react';
import { User, Party, Transaction, TabType } from '../types';
import { ChevronRight } from 'lucide-react';

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
  const cards = [
    { 
      title: 'Total Outstanding', 
      amount: stats.totalOutstanding, 
      icon: <CreditCard className="w-5 h-5 text-rose-500" />,
      color: 'bg-rose-50 dark:bg-rose-900/10',
      isDynamic: true
    },
    { 
      title: 'Total Collected', 
      amount: stats.totalCollected, 
      icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
      color: 'bg-emerald-50 dark:bg-emerald-900/10',
      isDynamic: false
    },
    { 
      title: 'Net Receivables', 
      amount: stats.totalCredit - stats.totalCollected, 
      icon: <Landmark className="w-5 h-5 text-indigo-500" />,
      color: 'bg-indigo-50 dark:bg-indigo-900/10',
      isDynamic: true
    },
    {
      title: 'Monthly Work',
      amount: stats.monthlyWork,
      icon: <Wallet className="w-5 h-5 text-amber-500" />,
      color: 'bg-amber-50 dark:bg-amber-900/10',
      isDynamic: false
    }
  ,
    {
      title: 'Total Parties',
      amount: parties.length,
      icon: <Users className="w-5 h-5 text-purple-500" />,
      color: 'bg-purple-50 dark:bg-purple-900/10',
      isDynamic: false,
      onClick: () => { if (setActiveTab) setActiveTab('parties'); }
    }
  ];

  return (
    <div className="space-y-6 pt-14 md:pt-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-in fade-in slide-in-from-left-8 duration-700 ease-out">
        <div>
          <div className="text-[9px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-[0.3em] mb-1 px-1">
            {user?.business_name || 'EMBRODERY STATEMENT'}
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
            Overview
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
                  {card.title === 'Total Parties' ? card.amount : `৳${card.amount.toLocaleString('en-IN')}`}
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
