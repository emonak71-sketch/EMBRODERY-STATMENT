import React, { useMemo, useState } from 'react';
import { ClipboardList, Search, ArrowLeft, ChevronRight, Layers3, PackageCheck } from 'lucide-react';
import { Party, Transaction, TabType } from '../types';

interface JobOrdersProps {
  parties: Party[];
  transactions: Transaction[];
  setActiveTab: (tab: TabType) => void;
  setSelectedParty: (party: Party) => void;
}

const money = (value: number) => `৳${Number(value || 0).toLocaleString('en-IN')}`;

const JobOrders: React.FC<JobOrdersProps> = ({ parties, transactions, setActiveTab, setSelectedParty }) => {
  const [query, setQuery] = useState('');
  const activeParties = useMemo(() => parties.filter(party => !party.is_deleted), [parties]);

  const jobs = useMemo(() => {
    const partyMap = new Map<string, Party>(activeParties.map(party => [party.id, party] as [string, Party]));
    const normalizedQuery = query.trim().toLowerCase();
    return transactions
      .filter(transaction => Number(transaction.credit) > 0 && partyMap.has(transaction.party_id))
      .map(transaction => ({ ...transaction, party: partyMap.get(transaction.party_id)! }))
      .filter(job => [
        job.bill_no,
        job.details || '',
        job.party.name,
        job.party.phone || ''
      ].some(value => value.toLowerCase().includes(normalizedQuery)))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeParties, transactions, query]);

  const totals = useMemo(() => ({
    orders: jobs.length,
    pcs: jobs.reduce((sum, job) => sum + (Number(job.pcs) || 0), 0),
    amount: jobs.reduce((sum, job) => sum + (Number(job.credit) || 0), 0)
  }), [jobs]);

  const openPartyLedger = (party: Party) => {
    setSelectedParty(party);
    setActiveTab('ledger');
  };

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div className="flex items-center gap-3">
          <div className="page-heading-icon"><ClipboardList className="h-6 w-6" /></div>
          <div>
            <p className="eyebrow">WORK & ORDER REGISTER</p>
            <h1 className="page-title">Job Orders</h1>
            <p className="page-subtitle">প্রতিটি কাস্টমারের কাজ, ডিজাইন, PCS, Rate ও বিলের হিসাব।</p>
          </div>
        </div>
        <button type="button" onClick={() => setActiveTab('ledger')} className="secondary-action">
          <ArrowLeft className="h-4 w-4" /> লেজারে যান
        </button>
      </header>

      <section className="metric-grid metric-grid-three">
        <article className="metric-card metric-blue"><div className="metric-icon"><ClipboardList /></div><p>মোট কাজের অর্ডার</p><strong>{totals.orders.toLocaleString('en-IN')}</strong></article>
        <article className="metric-card metric-cyan"><div className="metric-icon"><Layers3 /></div><p>মোট উৎপাদন (PCS)</p><strong>{totals.pcs.toLocaleString('en-IN')}</strong></article>
        <article className="metric-card metric-violet"><div className="metric-icon"><PackageCheck /></div><p>মোট কাজের মূল্য</p><strong>{money(totals.amount)}</strong></article>
      </section>

      <section className="glass-panel overflow-hidden">
        <div className="panel-toolbar">
          <div><h2 className="panel-title">সব কাজের অর্ডার</h2><p className="panel-hint">কোনো অর্ডারে ক্লিক করলে সংশ্লিষ্ট কাস্টমারের লেজার খুলবে।</p></div>
          <label className="search-field"><Search className="h-4 w-4" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Bill, design, customer বা phone খুঁজুন" /></label>
        </div>

        {jobs.length === 0 ? (
          <div className="empty-state"><ClipboardList className="h-9 w-9" /><strong>কোনো কাজের অর্ডার পাওয়া যায়নি</strong><span>লেজার থেকে নতুন Work Entry যোগ করলে এখানে দেখা যাবে।</span><button type="button" onClick={() => setActiveTab('ledger')} className="primary-action">নতুন কাজ যোগ করুন</button></div>
        ) : (
          <>
            <div className="desktop-table-wrap">
              <table className="data-table">
                <thead><tr><th>তারিখ</th><th>Bill No.</th><th>কাস্টমার</th><th>ডিজাইন / কাজ</th><th className="text-right">PCS</th><th className="text-right">Rate</th><th className="text-right">Amount</th><th></th></tr></thead>
                <tbody>{jobs.map(job => (
                  <tr key={job.id}>
                    <td>{new Date(job.date).toLocaleDateString('en-GB')}</td>
                    <td className="font-semibold">{job.bill_no}</td>
                    <td><strong>{job.party.name}</strong><small>{job.party.phone || 'ফোন নম্বর নেই'}</small></td>
                    <td>{job.details || 'Embroidery Work'}</td>
                    <td className="text-right tabular-nums">{Number(job.pcs || 0).toLocaleString('en-IN')}</td>
                    <td className="text-right tabular-nums">{money(Number(job.rate || 0))}</td>
                    <td className="text-right font-bold tabular-nums">{money(Number(job.credit || 0))}</td>
                    <td><button type="button" className="icon-action" onClick={() => openPartyLedger(job.party)} aria-label={`Open ${job.party.name} ledger`}><ChevronRight className="h-4 w-4" /></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="mobile-record-list">{jobs.map(job => (
              <button type="button" key={job.id} className="mobile-record-card" onClick={() => openPartyLedger(job.party)}>
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate">{job.party.name}</strong><span className="record-muted">{job.bill_no} · {new Date(job.date).toLocaleDateString('en-GB')}</span></div><span className="record-amount">{money(Number(job.credit || 0))}</span></div>
                <p className="mt-2 truncate text-sm">{job.details || 'Embroidery Work'}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 record-muted"><span>{Number(job.pcs || 0).toLocaleString('en-IN')} PCS</span><span>Rate {money(Number(job.rate || 0))}</span></div>
              </button>
            ))}</div>
          </>
        )}
      </section>
    </div>
  );
};

export default JobOrders;
