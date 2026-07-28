import React from 'react';
import { ChevronRight, Users, Plus, X } from 'lucide-react';
import { Party, Transaction, TabType } from '../types';

interface PartiesListProps {
  parties: Party[];
  transactions: Transaction[];
  setActiveTab: (tab: TabType) => void;
  setSelectedParty: (party: Party) => void;
  onAddParty: (name: string, phone: string) => Promise<void>;
}

const PartiesList: React.FC<PartiesListProps> = ({ parties, transactions, setActiveTab, setSelectedParty, onAddParty }) => {
  const [showAddParty, setShowAddParty] = React.useState(false);
  const [newPartyName, setNewPartyName] = React.useState('');
  const [newPartyPhone, setNewPartyPhone] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleAddParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddParty(newPartyName, newPartyPhone);
      setNewPartyName('');
      setNewPartyPhone('');
      setShowAddParty(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="space-y-6 pt-14 md:pt-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-in fade-in slide-in-from-left-8 duration-700 ease-out">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
            All Parties
          </h1>
        </div>
        <button
          onClick={() => setShowAddParty(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-primary-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Party
        </button>
      </div>
      
      <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in zoom-in-95 fade-in duration-500">
        {parties.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm font-bold">No parties found.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {parties.map(party => {
              const partyTxs = transactions.filter(t => t.party_id === party.id);
              const totalCredit = partyTxs.reduce((sum, t) => sum + (Number(t.credit) || 0), 0);
              const totalPayment = partyTxs.reduce((sum, t) => sum + (Number(t.payment) || 0), 0);
              const balance = totalCredit - totalPayment;
              
              return (
                <button 
                  key={party.id}
                  onClick={() => {
                    setSelectedParty(party);
                    setActiveTab('ledger');
                  }}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group text-left"
                >
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors">{party.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">{party.phone || 'No phone number'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Due Balance</p>
                      <p className={`text-sm font-black ${balance > 0 ? 'text-rose-600' : balance < 0 ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`}>
                        ৳{balance.toLocaleString('en-IN')}
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
      
      {showAddParty && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm animate-in zoom-in-95 relative">
            <button onClick={() => setShowAddParty(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-black uppercase tracking-tight mb-4 text-slate-900 dark:text-white">Add New Party</h3>
            <form onSubmit={handleAddParty} className="space-y-3">
              <input 
                type="text" 
                placeholder="Party Name" 
                required
                value={newPartyName}
                onChange={(e) => setNewPartyName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold p-3 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
              <input 
                type="tel" 
                placeholder="Phone No" 
                value={newPartyPhone}
                onChange={(e) => setNewPartyPhone(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold p-3 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              />
              <button type="submit" disabled={isSubmitting} className="w-full bg-primary-600 hover:bg-primary-700 text-white text-xs font-black uppercase py-3.5 rounded-xl tracking-widest shadow-lg shadow-primary-500/20 transition-all active:scale-95 disabled:opacity-50">
                {isSubmitting ? 'Adding...' : 'Add Party'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartiesList;
