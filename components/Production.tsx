import React, { useMemo, useState } from 'react';
import { Factory, Search, Layers3, Coins, Palette } from 'lucide-react';
import { Party, Transaction } from '../types';

interface ProductionProps {
  parties: Party[];
  transactions: Transaction[];
}

const money = (value: number) => `৳${Number(value || 0).toLocaleString('en-IN')}`;

const Production: React.FC<ProductionProps> = ({ parties, transactions }) => {
  const [query, setQuery] = useState('');
  const production = useMemo(() => {
    const partyMap = new Map(parties.map(party => [party.id, party]));
    const grouped = new Map<string, { design: string; pcs: number; amount: number; orders: number; customers: Set<string> }>();
    transactions.filter(tx => Number(tx.credit) > 0).forEach(tx => {
      const design = (tx.details || '').trim() || 'General Embroidery Work';
      const current = grouped.get(design) || { design, pcs: 0, amount: 0, orders: 0, customers: new Set<string>() };
      current.pcs += Number(tx.pcs) || 0;
      current.amount += Number(tx.credit) || 0;
      current.orders += 1;
      const party = partyMap.get(tx.party_id);
      if (party) current.customers.add(party.id);
      grouped.set(design, current);
    });
    return Array.from(grouped.values())
      .filter(item => item.design.toLowerCase().includes(query.trim().toLowerCase()))
      .map(item => ({ ...item, averageRate: item.pcs > 0 ? item.amount / item.pcs : 0, customerCount: item.customers.size }))
      .sort((a, b) => b.pcs - a.pcs);
  }, [parties, transactions, query]);

  const totalPcs = production.reduce((sum, item) => sum + item.pcs, 0);
  const totalAmount = production.reduce((sum, item) => sum + item.amount, 0);
  const totalOrders = production.reduce((sum, item) => sum + item.orders, 0);

  return (
    <div className="page-stack">
      <header className="page-heading">
        <div className="flex items-center gap-3">
          <div className="page-heading-icon"><Factory className="h-6 w-6" /></div>
          <div><p className="eyebrow">PCS & DESIGN ANALYTICS</p><h1 className="page-title">Production Summary</h1><p className="page-subtitle">ডিজাইন অনুযায়ী মোট PCS, গড় Rate, কাজের পরিমাণ ও অর্ডার বিশ্লেষণ।</p></div>
        </div>
      </header>

      <section className="metric-grid metric-grid-three">
        <article className="metric-card metric-cyan"><div className="metric-icon"><Layers3 /></div><p>মোট উৎপাদন</p><strong>{totalPcs.toLocaleString('en-IN')} PCS</strong></article>
        <article className="metric-card metric-blue"><div className="metric-icon"><Coins /></div><p>মোট Production Value</p><strong>{money(totalAmount)}</strong></article>
        <article className="metric-card metric-violet"><div className="metric-icon"><Factory /></div><p>মোট Work Entries</p><strong>{totalOrders.toLocaleString('en-IN')}</strong></article>
      </section>

      <section className="glass-panel overflow-hidden">
        <div className="panel-toolbar">
          <div><h2 className="panel-title">ডিজাইনভিত্তিক উৎপাদন</h2><p className="panel-hint">Work Entry-তে দেওয়া Design / Work Details অনুযায়ী হিসাব।</p></div>
          <label className="search-field"><Search className="h-4 w-4" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="ডিজাইন বা কাজের নাম খুঁজুন" /></label>
        </div>
        {production.length === 0 ? (
          <div className="empty-state"><Palette className="h-9 w-9" /><strong>এখনো Production Data নেই</strong><span>Work Entry-তে PCS, Rate ও Design Name যোগ করলে এখানে বিশ্লেষণ দেখা যাবে।</span></div>
        ) : (
          <>
            <div className="desktop-table-wrap">
              <table className="data-table">
                <thead><tr><th>ডিজাইন / কাজ</th><th className="text-right">অর্ডার</th><th className="text-right">কাস্টমার</th><th className="text-right">মোট PCS</th><th className="text-right">গড় Rate</th><th className="text-right">মোট মূল্য</th></tr></thead>
                <tbody>{production.map(item => (
                  <tr key={item.design}><td><strong>{item.design}</strong></td><td className="text-right tabular-nums">{item.orders}</td><td className="text-right tabular-nums">{item.customerCount}</td><td className="text-right font-bold tabular-nums">{item.pcs.toLocaleString('en-IN')}</td><td className="text-right tabular-nums">{money(item.averageRate)}</td><td className="text-right font-bold tabular-nums">{money(item.amount)}</td></tr>
                ))}</tbody>
              </table>
            </div>
            <div className="mobile-record-list">{production.map(item => (
              <article className="mobile-record-card" key={item.design}>
                <div className="flex items-start justify-between gap-3"><strong className="min-w-0 truncate">{item.design}</strong><span className="record-amount">{money(item.amount)}</span></div>
                <div className="mt-3 grid grid-cols-2 gap-3 record-muted"><span>{item.pcs.toLocaleString('en-IN')} PCS</span><span>{item.orders} Orders</span><span>{item.customerCount} Customers</span><span>Avg. {money(item.averageRate)} / PCS</span></div>
              </article>
            ))}</div>
          </>
        )}
      </section>
    </div>
  );
};

export default Production;
