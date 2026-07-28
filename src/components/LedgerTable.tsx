import React, { useState } from 'react';
import { TransactionEntry, Party } from '../types';
import {
  Search,
  Filter,
  Copy,
  Check,
  Printer,
  Smartphone,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Code,
  FileSpreadsheet,
  Plus,
} from 'lucide-react';

interface LedgerTableProps {
  transactions: TransactionEntry[];
  parties: Party[];
  selectedPartyId: string | null;
  onSelectParty: (partyId: string | null) => void;
  onOpenPrintMemo: (tx: TransactionEntry) => void;
  onOpenAIMemoModal: () => void;
  onOpenManualModal: () => void;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({
  transactions,
  parties,
  selectedPartyId,
  onSelectParty,
  onOpenPrintMemo,
  onOpenAIMemoModal,
  onOpenManualModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'BAKI (+)' | 'PAYMENT (-)'>('ALL');
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);
  const [copiedSMSId, setCopiedSMSId] = useState<string | null>(null);

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    // Party filter
    if (selectedPartyId) {
      const party = parties.find((p) => p.id === selectedPartyId);
      if (party && tx.party_name.trim().toLowerCase() !== party.name.trim().toLowerCase()) {
        return false;
      }
    }

    // Type filter
    if (typeFilter !== 'ALL' && tx.transaction_type !== typeFilter) {
      return false;
    }

    // Search query
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        tx.party_name.toLowerCase().includes(q) ||
        tx.memo_no.toLowerCase().includes(q) ||
        tx.mobile.includes(q) ||
        tx.date.includes(q) ||
        (tx.item_description && tx.item_description.toLowerCase().includes(q))
      );
    }

    return true;
  });

  const handleCopyJSON = (tx: TransactionEntry) => {
    const devOutput = {
      party_name: tx.party_name,
      mobile: tx.mobile,
      memo_no: tx.memo_no,
      date: tx.date,
      pcs: tx.pcs,
      rate: tx.rate,
      total_amount: tx.total_amount,
      transaction_type: tx.transaction_type,
      previous_balance: tx.previous_balance,
      updated_balance: tx.updated_balance,
      sms_draft: tx.sms_draft,
    };

    navigator.clipboard.writeText(JSON.stringify(devOutput, null, 2));
    setCopiedTxId(tx.id);
    setTimeout(() => setCopiedTxId(null), 2000);
  };

  const handleCopySMS = (tx: TransactionEntry) => {
    navigator.clipboard.writeText(tx.sms_draft);
    setCopiedSMSId(tx.id);
    setTimeout(() => setCopiedSMSId(null), 2000);
  };

  const selectedParty = parties.find((p) => p.id === selectedPartyId);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
      {/* Table Top Controls & Toolbar */}
      <div className="p-5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-primary-500/20 text-primary-400 border border-primary-500/30">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <span>ডিজিটাল লেজার খাতা (Transaction Ledger)</span>
              {selectedParty && (
                <span className="px-2 py-0.5 text-xs bg-primary-600/30 text-blue-300 rounded-md border border-primary-500/40 font-medium">
                  {selectedParty.name}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              সকল ডেলিভারি চালান মেমো ও পেমেন্ট হিস্ট্রি টেবিল ভিউ
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenAIMemoModal}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 transition-all shadow-md flex items-center space-x-1.5"
          >
            <span>+ AI মেমো প্রসেসর</span>
          </button>
          <button
            onClick={onOpenManualModal}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>ম্যানুয়াল এন্ট্রি</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Search Field */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="পার্টির নাম, মেমো নম্বর, মোবাইল দিয়ে খুঁজুন..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-primary-500 placeholder-slate-600"
          />
        </div>

        {/* Party Filter Selector */}
        <select
          value={selectedPartyId || ''}
          onChange={(e) => onSelectParty(e.target.value || null)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-primary-500 min-w-[160px]"
        >
          <option value="">-- সকল কাস্টমার / পার্টি --</option>
          {parties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (বাকি: ৳ {p.current_balance.toLocaleString('bn-BD')})
            </option>
          ))}
        </select>

        {/* Transaction Type Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              typeFilter === 'ALL'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            সকল
          </button>
          <button
            onClick={() => setTypeFilter('BAKI (+)')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              typeFilter === 'BAKI (+)'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            বাকি (BAKI +)
          </button>
          <button
            onClick={() => setTypeFilter('PAYMENT (-)')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              typeFilter === 'PAYMENT (-)'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            পেমেন্ট (PAYMENT -)
          </button>
        </div>
      </div>

      {/* Main Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <th className="p-3.5 pl-5">মেমো ও তারিখ</th>
              <th className="p-3.5">পার্টি ও মোবাইল</th>
              <th className="p-3.5">আইটেম / পরিমাণ (Pcs x Rate)</th>
              <th className="p-3.5 text-right">টাকা (Amount)</th>
              <th className="p-3.5 text-center">লেনদেন টাইপ</th>
              <th className="p-3.5 text-right">আপডেটেড বাকি</th>
              <th className="p-3.5 text-center pr-5">অ্যাকশন (Copy JSON / SMS / Print)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">
                  কোনো লেনদেনের তথ্য পাওয়া যায়নি।
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => {
                const isBaki = tx.transaction_type === 'BAKI (+)';
                return (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors group">
                    {/* Memo & Date */}
                    <td className="p-3.5 pl-5 font-mono">
                      <span className="font-bold text-primary-400 block">{tx.memo_no}</span>
                      <span className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                        <Calendar className="w-3 h-3 inline" />
                        <span>{tx.date}</span>
                      </span>
                    </td>

                    {/* Party & Mobile */}
                    <td className="p-3.5 font-medium">
                      <span className="text-slate-100 font-bold block">{tx.party_name}</span>
                      <span className="text-slate-500 text-[11px] font-mono">{tx.mobile}</span>
                    </td>

                    {/* Item Description & Rate Math */}
                    <td className="p-3.5">
                      <span className="text-slate-200 block truncate max-w-[180px]">
                        {tx.item_description || 'চালান সাপ্লাই'}
                      </span>
                      {tx.pcs > 0 ? (
                        <span className="text-[11px] font-mono text-slate-400">
                          {tx.pcs} পিস × ৳{tx.rate}
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-medium">ক্যাশ জমা</span>
                      )}
                    </td>

                    {/* Transaction Amount */}
                    <td className="p-3.5 text-right font-mono font-bold text-sm">
                      <span className={isBaki ? 'text-amber-400' : 'text-emerald-400'}>
                        ৳ {tx.total_amount.toLocaleString('bn-BD')}
                      </span>
                    </td>

                    {/* Transaction Type Tag */}
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isBaki
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {isBaki ? (
                          <>
                            <ArrowUpRight className="w-3 h-3 mr-0.5" />
                            <span>BAKI (+)</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft className="w-3 h-3 mr-0.5" />
                            <span>PAYMENT (-)</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Updated Balance Calculation */}
                    <td className="p-3.5 text-right font-mono font-extrabold text-slate-100">
                      ৳ {tx.updated_balance.toLocaleString('bn-BD')}
                    </td>

                    {/* Action buttons */}
                    <td className="p-3.5 pr-5 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        {/* Copy Developer JSON */}
                        <button
                          onClick={() => handleCopyJSON(tx)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                          title="Copy Structured Developer JSON"
                        >
                          {copiedTxId === tx.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Code className="w-3.5 h-3.5 text-slate-400 hover:text-primary-400" />
                          )}
                        </button>

                        {/* Copy SMS */}
                        <button
                          onClick={() => handleCopySMS(tx)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                          title="Copy Bangla Customer SMS"
                        >
                          {copiedSMSId === tx.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Smartphone className="w-3.5 h-3.5 text-slate-400 hover:text-emerald-400" />
                          )}
                        </button>

                        {/* Print Memo Slip */}
                        <button
                          onClick={() => onOpenPrintMemo(tx)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                          title="View/Print Cash Memo"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-400 hover:text-amber-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
