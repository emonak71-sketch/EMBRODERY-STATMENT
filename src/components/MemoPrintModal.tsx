import React, { useRef } from 'react';
import { TransactionEntry, Party } from '../types';
import { Printer, Download, X, CheckCircle, Phone, MapPin, Calendar, FileText } from 'lucide-react';

interface MemoPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionEntry | null;
  party?: Party;
}

export const MemoPrintModal: React.FC<MemoPrintModalProps> = ({
  isOpen,
  onClose,
  transaction,
  party,
}) => {
  const memoRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-slate-200 font-bold text-sm">
            <FileText className="w-4 h-4 text-primary-400" />
            <span>অফিসিয়াল ক্যাশ মেমো / মেমো স্লিপ প্রিভিউ</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট মেমো</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Memo Document Body */}
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          <div
            ref={memoRef}
            className="p-8 bg-white text-slate-900 rounded-xl shadow-md border border-slate-200 font-sans print:p-0 print:shadow-none print:border-none"
            id="printable-memo-area"
          >
            {/* Header / Store Branding */}
            <div className="text-center pb-4 border-b-2 border-slate-900 mb-6">
              <span className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-bold text-xs uppercase tracking-widest mb-1">
                মেমো / চালান স্লিপ
              </span>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                হিসাব খাতা হোলসেল এন্টারপ্রাইজ
              </h1>
              <p className="text-xs text-slate-600">
                পাইকারী ও খুচরা গার্মেন্টস, ফেব্রিক্স এবং টেক্সটাইল মার্চেন্ট
              </p>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-center space-x-3">
                <span>চকবাজার, ঢাকা-১২১১</span> | <span>মোবাইল: ০১৭০০-০০০০০০</span>
              </p>
            </div>

            {/* Customer & Memo Metadata */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <p className="text-slate-500 font-medium">কাস্টমার / পার্টির নাম:</p>
                <p className="font-bold text-slate-900 text-sm">{transaction.party_name}</p>
                <p className="text-slate-600">মব: {transaction.mobile}</p>
                {party && <p className="text-slate-500">ঠিকানা: {party.address}</p>}
              </div>

              <div className="text-right">
                <p className="text-slate-500 font-medium">মেমো নম্বর:</p>
                <p className="font-bold font-mono text-slate-900 text-sm">{transaction.memo_no}</p>
                <p className="text-slate-600">তারিখ: {transaction.date}</p>
                <p className="text-slate-500 font-semibold mt-1">
                  ধরন: <span className="underline">{transaction.transaction_type}</span>
                </p>
              </div>
            </div>

            {/* Item Ledger Table */}
            <table className="w-full text-left text-xs border-collapse mb-6">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                  <th className="p-2.5 border border-slate-900">বিবরণ / আইটেম</th>
                  <th className="p-2.5 border border-slate-900 text-center">পরিমাণ (Pcs)</th>
                  <th className="p-2.5 border border-slate-900 text-right">দর (Rate)</th>
                  <th className="p-2.5 border border-slate-900 text-right">মোট টাকা (BDT)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-300">
                  <td className="p-2.5 font-medium border-x border-slate-200">
                    {transaction.item_description || 'পণ্য সরবরাহ / চালান এন্ট্রি'}
                  </td>
                  <td className="p-2.5 text-center font-mono border-x border-slate-200">
                    {transaction.pcs > 0 ? transaction.pcs : '-'}
                  </td>
                  <td className="p-2.5 text-right font-mono border-x border-slate-200">
                    {transaction.rate > 0 ? `৳ ${transaction.rate}` : '-'}
                  </td>
                  <td className="p-2.5 text-right font-bold font-mono border-x border-slate-200">
                    ৳ {transaction.total_amount.toLocaleString('bn-BD')}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Calculations Balance Summary */}
            <div className="flex justify-end mb-8">
              <div className="w-full max-w-xs space-y-1.5 text-xs p-3 bg-slate-100 rounded-lg border border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>আজকের চালানের পরিমাণ:</span>
                  <span className="font-bold">৳ {transaction.total_amount.toLocaleString('bn-BD')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>পূর্বের বাকি ব্যালেন্স:</span>
                  <span className="font-bold">৳ {transaction.previous_balance.toLocaleString('bn-BD')}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-300 font-extrabold text-slate-900 text-sm">
                  <span>বর্তমান মোট বাকি:</span>
                  <span className="text-blue-700 font-mono">৳ {transaction.updated_balance.toLocaleString('bn-BD')}</span>
                </div>
              </div>
            </div>

            {/* Footer Signature */}
            <div className="flex justify-between items-end pt-12 border-t border-dashed border-slate-300 text-[11px] text-slate-600">
              <div>
                <p className="border-t border-slate-400 pt-1 px-4 text-center">কাস্টমারের স্বাক্ষর</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 font-mono mb-1">Hisaab Khata 3D Verified Memo</p>
                <p className="border-t border-slate-900 pt-1 px-6 font-bold text-slate-900">মালিক / ক্যাশিয়ারের স্বাক্ষর</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
