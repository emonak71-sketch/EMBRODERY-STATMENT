import React, { useState, useEffect } from 'react';
import { Party, TransactionEntry, TransactionType } from '../types';
import { Plus, Check, X, Calculator, Smartphone, FileText, ArrowRight } from 'lucide-react';

interface ManualTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  parties: Party[];
  onAddTransaction: (transaction: Omit<TransactionEntry, 'id'>) => void;
  defaultPartyName?: string;
}

export const ManualTransactionModal: React.FC<ManualTransactionModalProps> = ({
  isOpen,
  onClose,
  parties,
  onAddTransaction,
  defaultPartyName = '',
}) => {
  const [partyName, setPartyName] = useState(defaultPartyName);
  const [mobile, setMobile] = useState('');
  const [memoNo, setMemoNo] = useState(`#MEMO-${Math.floor(1000 + Math.random() * 9000)}`);
  const [date, setDate] = useState(new Date().toLocaleDateString('en-GB'));
  const [pcs, setPcs] = useState<number>(0);
  const [rate, setRate] = useState<number>(0);
  const [flatAmount, setFlatAmount] = useState<number>(0);
  const [transactionType, setTransactionType] = useState<TransactionType>('BAKI (+)');
  const [itemDescription, setItemDescription] = useState('');

  // Selected party balance tracking
  const [prevBal, setPrevBal] = useState<number>(0);

  useEffect(() => {
    if (defaultPartyName) {
      setPartyName(defaultPartyName);
    }
  }, [defaultPartyName]);

  // When party changes, auto-fill mobile & previous balance
  useEffect(() => {
    const existing = parties.find((p) => p.name.trim().toLowerCase() === partyName.trim().toLowerCase());
    if (existing) {
      setMobile(existing.mobile);
      setPrevBal(existing.current_balance);
    } else {
      setPrevBal(0);
    }
  }, [partyName, parties]);

  if (!isOpen) return null;

  // Calculation formulas
  const deliveryTotal = pcs * rate;
  const totalAmount = transactionType === 'BAKI (+)' ? (pcs > 0 ? deliveryTotal : flatAmount) : flatAmount;

  const updatedBalance =
    transactionType === 'BAKI (+)' ? prevBal + totalAmount : prevBal - totalAmount;

  // SMS string preview
  let smsDraft = '';
  if (transactionType === 'BAKI (+)') {
    smsDraft = `প্রিয় ${partyName || 'কাস্টমার'}, মেমো ${memoNo} অনুযায়ী ${pcs > 0 ? `${pcs} পিস (দর ${rate} টাকা)` : ''} মোট ${totalAmount.toLocaleString('bn-BD')} টাকা বাকি যোগ হয়েছে। আপনার পূর্বের ব্যালেন্স ${prevBal.toLocaleString('bn-BD')} টাকা সহ বর্তমান মোট বাকি ${updatedBalance.toLocaleString('bn-BD')} টাকা। ধন্যবাদ। - হিসাব খাতা 3D`;
  } else {
    smsDraft = `প্রিয় ${partyName || 'কাস্টমার'}, আপনার কাছ থেকে ${totalAmount.toLocaleString('bn-BD')} টাকা পেমেন্ট জমা পাওয়া গেছে (মেমো ${memoNo})। আপনার পূর্বের ব্যালেন্স ${prevBal.toLocaleString('bn-BD')} টাকা থেকে কমে বর্তমান মোট বাকি ${updatedBalance.toLocaleString('bn-BD')} টাকা। ধন্যবাদ। - হিসাব খাতা 3D`;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName) return;

    onAddTransaction({
      party_name: partyName,
      mobile: mobile || '01700000000',
      memo_no: memoNo,
      date,
      pcs: transactionType === 'BAKI (+)' ? pcs : 0,
      rate: transactionType === 'BAKI (+)' ? rate : 0,
      total_amount: totalAmount,
      transaction_type: transactionType,
      previous_balance: prevBal,
      updated_balance: updatedBalance,
      sms_draft: smsDraft,
      item_description: itemDescription || (transactionType === 'BAKI (+)' ? 'পণ্য সরবরাহ' : 'সাপ্তাহিক পেমেন্ট'),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between p-5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary-600 text-white shadow-lg">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">নতুন ডেলিভারি মেমো ও পেমেন্ট এন্ট্রি</h3>
              <p className="text-xs text-slate-400">চালানের হিসাব ও সাপ্তাহিক কালেকশন এন্ট্রি করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Transaction Type Toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTransactionType('BAKI (+)')}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-2 ${
                transactionType === 'BAKI (+)'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>বাকিতে পণ্য সরবরাহ (BAKI +)</span>
            </button>
            <button
              type="button"
              onClick={() => setTransactionType('PAYMENT (-)')}
              className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-2 ${
                transactionType === 'PAYMENT (-)'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <span>সাপ্তাহিক পেমেন্ট জমা (PAYMENT -)</span>
            </button>
          </div>

          {/* Party selection or new entry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                পার্টি নাম / কাস্টমার:
              </label>
              <input
                type="text"
                list="party-suggestions"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="যেমন: রহিম ট্রেডার্স"
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-primary-500"
              />
              <datalist id="party-suggestions">
                {parties.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                মোবাইল নম্বর:
              </label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                মেমো / চালান নম্বর:
              </label>
              <input
                type="text"
                value={memoNo}
                onChange={(e) => setMemoNo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono text-sm focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                তারিখ (DD/MM/YYYY):
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          {/* Core Delivery Math Inputs */}
          {transactionType === 'BAKI (+)' ? (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-amber-400 block">
                চালান মোট পরিমাণ সূত্র: Pieces (Qty) × Rate per Piece
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">পিস (Pieces / Qty):</label>
                  <input
                    type="number"
                    value={pcs || ''}
                    onChange={(e) => setPcs(Number(e.target.value))}
                    placeholder="যেমন: ১০০"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">দর প্রতি পিস (Rate per Piece):</label>
                  <input
                    type="number"
                    value={rate || ''}
                    onChange={(e) => setRate(Number(e.target.value))}
                    placeholder="যেমন: ৪৫০"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-400">হিসাবকৃত মোট টাকার পরিমাণ:</span>
                <span className="text-base font-extrabold text-amber-400 font-mono">
                  ৳ {deliveryTotal.toLocaleString('bn-BD')}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-emerald-400 mb-1">
                জমা পেমেন্টের টাকার পরিমাণ (BDT):
              </label>
              <input
                type="number"
                value={flatAmount || ''}
                onChange={(e) => setFlatAmount(Number(e.target.value))}
                placeholder="যেমন: ৫০,০০০"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-emerald-400 font-extrabold text-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              পণ্যের বিবরণ / নোটস:
            </label>
            <input
              type="text"
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              placeholder="যেমন: কটন টি-শার্ট / থান কাপড়"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Balance Math Verification Rule 2 */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
            <span className="font-bold text-slate-400 block text-[11px] uppercase tracking-wider">
              ব্যালেন্স ম্যাথ ফর্মুলা:
            </span>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">পূর্বের বাকি: ৳ {prevBal.toLocaleString('bn-BD')}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-slate-400">
                {transactionType === 'BAKI (+)' ? '+' : '-'} ৳ {totalAmount.toLocaleString('bn-BD')}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="font-bold text-amber-400 text-sm">
                বর্তমান বাকি: ৳ {updatedBalance.toLocaleString('bn-BD')}
              </span>
            </div>
          </div>

          {/* SMS Draft Preview */}
          <div className="p-3 bg-blue-950/30 border border-blue-900/50 rounded-xl text-xs space-y-1">
            <span className="text-[10px] font-bold text-primary-400 flex items-center space-x-1">
              <Smartphone className="w-3.5 h-3.5" />
              <span>বাংলা SMS প্রিভিউ:</span>
            </span>
            <p className="text-slate-300 text-xs font-sans leading-relaxed">{smsDraft}</p>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-500 font-bold text-sm text-white rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
          >
            <Check className="w-4 h-4" />
            <span>লেজারে যোগ করুন</span>
          </button>
        </form>
      </div>
    </div>
  );
};
