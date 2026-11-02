import React, { useState, useMemo } from 'react';
import { ChevronRight, ArrowLeft, Calendar, FileText } from 'lucide-react';
import { Transaction, Party } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface MonthlyCollectionsProps {
  setActiveTab: (t: string) => void;
  transactions: Transaction[];
  parties: Party[];
}

const MonthlyCollections: React.FC<MonthlyCollectionsProps> = ({ transactions, parties, setActiveTab }) => {
  const { t } = useLanguage();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Group transactions by month
  const monthlyData = useMemo(() => {
    const data: Record<string, { 
      totalWork: number; 
      transactions: (Transaction & { partyName: string })[];
      partyTotals: Record<string, { name: string; total: number; memos: number; id: string }>;
    }> = {};
    
    // Sort transactions by date descending
    const sortedTxs = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    sortedTxs.forEach(tx => {
      // Only consider work (credit > 0)
      if (tx.payment > 0) {
        const date = new Date(tx.date);
        const monthYear = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        
        if (!data[monthYear]) {
          data[monthYear] = { totalWork: 0, transactions: [], partyTotals: {} };
        }
        
        data[monthYear].totalWork += Number(tx.payment);
        
        const party = parties.find(p => p.id === tx.party_id);
        const partyName = party ? party.name : 'Unknown Party';
        
        data[monthYear].transactions.push({
          ...tx,
          partyName
        });

        if (party) {
          if (!data[monthYear].partyTotals[party.id]) {
            data[monthYear].partyTotals[party.id] = { name: partyName, total: 0, memos: 0, id: party.id };
          }
          data[monthYear].partyTotals[party.id].total += Number(tx.payment);
          data[monthYear].partyTotals[party.id].memos += 1;
        }
      }
    });
    
    return data;
  }, [transactions, parties]);

  const monthKeys = Object.keys(monthlyData);

  if (selectedMonth && monthlyData[selectedMonth]) {
    const monthDetails = monthlyData[selectedMonth];
    
    // Convert partyTotals to array and sort descending by total
    const sortedParties = Object.values(monthDetails.partyTotals).sort((a: any, b: any) => b.total - a.total) as {name: string, total: number, memos: number, id: string}[];

    return (
      <div className="space-y-6  animate-in fade-in">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedMonth(null)}
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
              {selectedMonth}
            </h1>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">
              TOTAL COLLECTED: ৳{monthDetails.totalWork.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-6">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
             <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{t('party_breakdown')}</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
             {sortedParties.map(p => (
               <div key={p.id} className="flex justify-between items-center p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                 <div>
                   <h4 className="text-sm font-black text-slate-900 dark:text-white">{p.name}</h4>
                   <p className="text-[10px] font-bold text-slate-400 mt-0.5">{p.memos} {t('memos')}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-sm font-black text-emerald-600">৳{p.total.toLocaleString('en-IN')}</p>
                 </div>
               </div>
             ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
             <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{t('all_memos')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('date')}</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('memo_no')}</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('party_name')}</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('details')}</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">{t('qty_rate')}</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">{t('amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm font-bold">
                {monthDetails.transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {new Date(tx.date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="p-4 whitespace-nowrap text-slate-900 dark:text-white">
                      {tx.bill_no}
                    </td>
                    <td className="p-4 text-primary-600 dark:text-primary-400">
                      {tx.partyName}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      {tx.details}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap text-slate-600 dark:text-slate-300">
                      <div className="flex flex-col items-end">
                        {tx.pcs ? <span>{tx.pcs} pcs</span> : <span>-</span>}
                        {tx.rate ? <span className="text-[10px] text-slate-400">@ ৳{tx.rate}</span> : null}
                      </div>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap text-emerald-600">
                      ৳{Number(tx.payment).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 ">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-in fade-in slide-in-from-left-8 duration-700 ease-out">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
              Monthly Collected
            </h1>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">
              {t('month_by_month')}
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in zoom-in-95 fade-in duration-500">
        {monthKeys.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm font-bold">No collection records found</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {monthKeys.map(month => {
              const data = monthlyData[month];
              return (
                <button 
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">{month}</h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">{data.transactions.length} {t('memos')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Collected</p>
                      <p className="text-sm font-black text-emerald-600">
                        ৳{data.totalWork.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary-500 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyCollections;
