import React, { useMemo, useState } from 'react';
import { ChevronRight, Users, Plus, X, ArrowLeft, Search } from 'lucide-react';
import { Party, Transaction, TabType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface PartiesListProps {
  parties: Party[];
  transactions: Transaction[];
  setActiveTab: (tab: TabType) => void;
  setSelectedParty: (party: Party) => void;
  onAddParty: (name: string, phone: string) => Promise<void>;
}

const PartiesList: React.FC<PartiesListProps> = ({ parties, transactions, setActiveTab, setSelectedParty, onAddParty }) => {
  const { t } = useLanguage();
  const [showAddParty, setShowAddParty] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredParties = useMemo(() => parties
    .filter(party => !party.is_deleted)
    .filter(party => party.name.toLowerCase().includes(searchTerm.toLowerCase()) || String(party.phone || '').includes(searchTerm))
    .sort((a, b) => a.name.localeCompare(b.name)), [parties, searchTerm]);

  const handleAddParty = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAddParty(newPartyName.trim(), newPartyPhone.trim());
      setNewPartyName('');
      setNewPartyPhone('');
      setShowAddParty(false);
    } catch (error) {
      console.error('Could not add party:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-stack pt-14 md:pt-0">
      <header className="page-heading">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setActiveTab('dashboard')} className="secondary-icon-action" aria-label="Back to dashboard"><ArrowLeft className="h-5 w-5" /></button>
          <div><p className="eyebrow">CUSTOMER RELATIONSHIP</p><h1 className="page-title">{t('all_parties')}</h1><p className="page-subtitle">কাস্টমার, যোগাযোগ এবং বর্তমান পাওনা এক জায়গায়।</p></div>
        </div>
        <button type="button" onClick={() => setShowAddParty(true)} className="primary-action"><Plus className="h-4 w-4" /> {t('add_party')}</button>
      </header>

      <section className="glass-panel overflow-hidden">
        <div className="panel-toolbar">
          <div><h2 className="panel-title">Customer Directory</h2><p className="panel-hint">{filteredParties.length} active customers</p></div>
          <label className="search-field"><Search className="h-4 w-4" /><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="নাম বা ফোন নম্বর খুঁজুন" /></label>
        </div>

        {filteredParties.length === 0 ? (
          <div className="empty-state"><Users className="h-9 w-9" /><strong>{searchTerm ? 'কোনো কাস্টমার পাওয়া যায়নি' : t('no_parties_found')}</strong><span>{searchTerm ? 'অন্য নাম বা ফোন নম্বর দিয়ে চেষ্টা করুন।' : 'প্রথম কাস্টমার যোগ করে হিসাব শুরু করুন।'}</span></div>
        ) : (
          <div className="divide-y divide-slate-100/80 dark:divide-white/5">
            {filteredParties.map(party => {
              const partyTransactions = transactions.filter(transaction => transaction.party_id === party.id);
              const totalCredit = partyTransactions.reduce((sum, transaction) => sum + (Number(transaction.credit) || 0), 0);
              const totalPayment = partyTransactions.reduce((sum, transaction) => sum + (Number(transaction.payment) || 0), 0);
              const balance = totalCredit - totalPayment;
              return (
                <button type="button" key={party.id} onClick={() => { setSelectedParty(party); setActiveTab('ledger'); }} className="customer-row">
                  <div className="customer-avatar"><Users className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1 text-left"><strong className="block truncate">{party.name}</strong><span className="record-muted">{party.phone || 'ফোন নম্বর নেই'}</span></div>
                  <div className="text-right"><span className="record-muted block">বর্তমান পাওনা</span><strong className={balance > 0 ? 'text-rose-600' : balance < 0 ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}>৳{balance.toLocaleString('en-IN')}</strong></div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {showAddParty && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 modal-backdrop">
          <section className="glass-modal relative w-full max-w-md p-6 sm:p-8">
            <button type="button" onClick={() => setShowAddParty(false)} className="absolute right-4 top-4 secondary-icon-action" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="mb-6"><p className="eyebrow">NEW CUSTOMER</p><h2 className="text-2xl font-black text-slate-900 dark:text-white">{t('add_new_party')}</h2></div>
            <form onSubmit={handleAddParty} className="space-y-4">
              <label className="block space-y-2"><span className="text-sm font-bold">পার্টির নাম</span><input type="text" placeholder={t('party_name')} required value={newPartyName} onChange={event => setNewPartyName(event.target.value)} className="auth-input" /></label>
              <label className="block space-y-2"><span className="text-sm font-bold">ফোন নম্বর</span><input type="tel" placeholder={t('phone_no')} value={newPartyPhone} onChange={event => setNewPartyPhone(event.target.value)} className="auth-input" /></label>
              <div className="grid grid-cols-2 gap-3 pt-2"><button type="button" onClick={() => setShowAddParty(false)} className="secondary-action justify-center">{t('cancel')}</button><button type="submit" disabled={isSubmitting} className="primary-action justify-center disabled:opacity-50">{isSubmitting ? 'যোগ হচ্ছে…' : 'কাস্টমার যোগ করুন'}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default PartiesList;
