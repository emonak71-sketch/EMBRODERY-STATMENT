import React, { useMemo, useState } from 'react';
import { Landmark, TrendingUp, CreditCard, Wallet, Users, ArrowLeft, ChevronRight, Layers3, ClipboardList, Factory, FileText, Plus, CalendarDays } from 'lucide-react';
import { User, Party, Transaction, TabType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface Stats {
  totalCredit: number;
  totalCollected: number;
  totalOutstanding: number;
  monthlyWork: number;
  monthlyCollected: number;
  totalPcs: number;
  totalOrders: number;
}

const money = (value: number) => `৳${Number(value || 0).toLocaleString('en-IN')}`;

const Dashboard: React.FC<{
  stats: Stats;
  user: User | null;
  parties?: Party[];
  transactions?: Transaction[];
  setActiveTab?: (tab: TabType) => void;
  setSelectedParty?: (party: Party) => void;
}> = ({ stats, user, parties = [], transactions = [], setActiveTab, setSelectedParty }) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'overview' | 'outstanding' | 'collected' | 'collected_party' | 'total_work'>('overview');
  const [selectedCollectedPartyId, setSelectedCollectedPartyId] = useState<string | null>(null);

  const activeParties = useMemo(() => parties.filter(party => !party.is_deleted), [parties]);

  const outstandingParties = useMemo(() => activeParties.map(party => {
    const partyTransactions = transactions.filter(transaction => transaction.party_id === party.id);
    const credit = partyTransactions.reduce((sum, transaction) => sum + (Number(transaction.credit) || 0), 0);
    const payment = partyTransactions.reduce((sum, transaction) => sum + (Number(transaction.payment) || 0), 0);
    return { ...party, balance: credit - payment };
  }).filter(party => party.balance > 0).sort((a, b) => b.balance - a.balance), [activeParties, transactions]);

  const collectedParties = useMemo(() => activeParties.map(party => {
    const totalPayment = transactions.filter(transaction => transaction.party_id === party.id)
      .reduce((sum, transaction) => sum + (Number(transaction.payment) || 0), 0);
    return { ...party, totalPayment };
  }).filter(party => party.totalPayment > 0).sort((a, b) => b.totalPayment - a.totalPayment), [activeParties, transactions]);

  const totalWorkParties = useMemo(() => activeParties.map(party => {
    const totalCredit = transactions.filter(transaction => transaction.party_id === party.id)
      .reduce((sum, transaction) => sum + (Number(transaction.credit) || 0), 0);
    return { ...party, totalCredit };
  }).filter(party => party.totalCredit > 0).sort((a, b) => b.totalCredit - a.totalCredit), [activeParties, transactions]);

  const partyPayments = useMemo(() => {
    if (!selectedCollectedPartyId) return [];
    return transactions.filter(transaction => transaction.party_id === selectedCollectedPartyId && Number(transaction.payment) > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCollectedPartyId, transactions]);

  const heading = viewMode === 'outstanding' ? t('total_outstanding')
    : viewMode === 'collected' ? t('total_collected')
    : viewMode === 'total_work' ? t('total_work')
    : viewMode === 'collected_party' ? 'Payment History'
    : '';

  if (viewMode !== 'overview') {
    const selectedParty = activeParties.find(party => party.id === selectedCollectedPartyId);
    const list = viewMode === 'outstanding' ? outstandingParties : viewMode === 'total_work' ? totalWorkParties : collectedParties;
    return (
      <div className="page-stack pt-14 md:pt-0">
        <header className="page-heading">
          <div className="flex items-center gap-3"><button type="button" onClick={() => setViewMode(viewMode === 'collected_party' ? 'collected' : 'overview')} className="secondary-icon-action" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button><div><p className="eyebrow">FINANCIAL BREAKDOWN</p><h1 className="page-title">{viewMode === 'collected_party' ? selectedParty?.name || heading : heading}</h1></div></div>
        </header>
        <section className="glass-panel overflow-hidden">
          {(viewMode === 'collected_party' ? partyPayments : list).length === 0 ? (
            <div className="empty-state"><Wallet className="h-9 w-9" /><strong>কোনো রেকর্ড পাওয়া যায়নি</strong></div>
          ) : viewMode === 'collected_party' ? (
            <div className="divide-y divide-slate-100/80 dark:divide-white/5">{partyPayments.map(transaction => <div key={transaction.id} className="customer-row"><div className="min-w-0 flex-1 text-left"><strong className="block">{transaction.details || t('payment_received')}</strong><span className="record-muted">{new Date(transaction.date).toLocaleDateString('en-GB')} · {transaction.bill_no}</span></div><strong className="text-emerald-600">{money(Number(transaction.payment))}</strong></div>)}</div>
          ) : (
            <div className="divide-y divide-slate-100/80 dark:divide-white/5">{list.map(party => <div key={party.id} className="customer-row"><div className="min-w-0 flex-1"><strong className="block">{party.name}</strong><span className="record-muted">{party.phone || 'ফোন নম্বর নেই'}</span></div><strong className={viewMode === 'outstanding' ? 'text-rose-600' : 'text-primary-600'}>{money(viewMode === 'outstanding' ? (party as any).balance : (party as any).totalCredit ?? (party as any).totalPayment)}</strong>{viewMode === 'collected' && <button type="button" className="icon-action" onClick={() => { setSelectedCollectedPartyId(party.id); setViewMode('collected_party'); }} aria-label="View payment history"><ChevronRight className="h-4 w-4" /></button>}</div>)}</div>
          )}
        </section>
      </div>
    );
  }

  const cards = [
    { title: t('total_outstanding'), value: money(stats.totalOutstanding), note: 'সব কাস্টমারের বর্তমান পাওনা', icon: <CreditCard />, tone: 'metric-rose', action: () => setViewMode('outstanding') },
    { title: t('total_collected'), value: money(stats.totalCollected), note: 'এ পর্যন্ত মোট আদায়', icon: <TrendingUp />, tone: 'metric-cyan', action: () => setViewMode('collected') },
    { title: t('total_work'), value: money(stats.totalCredit), note: 'মোট সম্পন্ন কাজের মূল্য', icon: <Landmark />, tone: 'metric-blue', action: () => setViewMode('total_work') },
    { title: t('total_parties'), value: activeParties.length.toLocaleString('en-IN'), note: 'সক্রিয় কাস্টমার', icon: <Users />, tone: 'metric-violet', action: () => setActiveTab?.('parties') },
    { title: t('monthly_work'), value: money(stats.monthlyWork), note: 'চলতি মাসের কাজ', icon: <CalendarDays />, tone: 'metric-blue', action: () => setActiveTab?.('monthly_reports') },
    { title: 'Monthly Collection', value: money(stats.monthlyCollected), note: 'চলতি মাসে আদায়', icon: <Wallet />, tone: 'metric-cyan', action: () => setActiveTab?.('monthly_collections') },
    { title: 'Total Production', value: `${Number(stats.totalPcs || 0).toLocaleString('en-IN')} PCS`, note: 'মোট উৎপাদিত পরিমাণ', icon: <Layers3 />, tone: 'metric-violet', action: () => setActiveTab?.('production') },
    { title: 'Job Orders', value: Number(stats.totalOrders || 0).toLocaleString('en-IN'), note: 'মোট Work Entries', icon: <ClipboardList />, tone: 'metric-amber', action: () => setActiveTab?.('job_orders') }
  ];

  return (
    <div className="page-stack pt-14 md:pt-0">
      <header className="page-heading dashboard-heading">
        <div><p className="eyebrow">{user?.business_name || 'EMBROIDERY STATEMENT'}</p><h1 className="page-title">Business Overview</h1><p className="page-subtitle">আপনার এমব্রয়ডারি ব্যবসার কাজ, উৎপাদন, আদায় ও পাওনার সারসংক্ষেপ।</p></div>
        <div className="date-chip"><span>LAST UPDATED</span><strong>{new Date().toLocaleDateString('en-GB')}</strong></div>
      </header>

      <section className="metric-grid">
        {cards.map((card, index) => (
          <button type="button" key={card.title} onClick={card.action} className={`metric-card ${card.tone} metric-card-button`} style={{ animationDelay: `${index * 55}ms` }}>
            <div className="metric-card-top"><span className="metric-icon">{card.icon}</span><ChevronRight className="h-4 w-4 opacity-50" /></div>
            <p>{card.title}</p><strong>{card.value}</strong><small>{card.note}</small>
          </button>
        ))}
      </section>

      <section className="glass-panel quick-access-panel">
        <div className="panel-toolbar"><div><h2 className="panel-title">Quick Access</h2><p className="panel-hint">প্রয়োজনীয় মডিউলে দ্রুত প্রবেশ করুন।</p></div></div>
        <div className="quick-access-grid">
          <button type="button" onClick={() => setActiveTab?.('parties')} className="quick-access-item"><span className="quick-access-icon"><Plus /></span><strong>কাস্টমার যোগ করুন</strong><small>New customer</small></button>
          <button type="button" onClick={() => setActiveTab?.('job_orders')} className="quick-access-item"><span className="quick-access-icon"><ClipboardList /></span><strong>Job Orders</strong><small>PCS ও Rate হিসাব</small></button>
          <button type="button" onClick={() => setActiveTab?.('production')} className="quick-access-item"><span className="quick-access-icon"><Factory /></span><strong>Production</strong><small>ডিজাইনভিত্তিক উৎপাদন</small></button>
          <button type="button" onClick={() => setActiveTab?.('monthly_reports')} className="quick-access-item"><span className="quick-access-icon"><FileText /></span><strong>Business Reports</strong><small>মাসিক রিপোর্ট</small></button>
        </div>
      </section>

      <section className="glass-panel overflow-hidden">
        <div className="panel-toolbar"><div><h2 className="panel-title">Top Outstanding Parties</h2><p className="panel-hint">যেসব কাস্টমারের কাছে সবচেয়ে বেশি পাওনা রয়েছে।</p></div><button type="button" onClick={() => setViewMode('outstanding')} className="text-sm font-bold text-primary-600 dark:text-primary-300">সব দেখুন <ChevronRight className="inline h-4 w-4" /></button></div>
        {outstandingParties.length === 0 ? <div className="empty-state"><Users className="h-8 w-8" /><strong>কোনো বকেয়া পাওনা নেই</strong></div> : <div className="divide-y divide-slate-100/80 dark:divide-white/5">{outstandingParties.slice(0, 5).map(party => <button type="button" key={party.id} className="customer-row" onClick={() => { setSelectedParty?.(party); setActiveTab?.('ledger'); }}><div className="min-w-0 flex-1 text-left"><strong className="block">{party.name}</strong><span className="record-muted">{party.phone || 'ফোন নম্বর নেই'}</span></div><strong className="text-rose-600">{money(party.balance)}</strong><ChevronRight className="h-4 w-4 text-slate-400" /></button>)}</div>}
      </section>
    </div>
  );
};

export default Dashboard;
