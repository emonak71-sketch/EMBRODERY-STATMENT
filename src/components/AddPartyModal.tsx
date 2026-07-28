import React, { useState } from 'react';
import { Party } from '../types';
import { UserPlus, X, Check, Building, Phone, MapPin, DollarSign } from 'lucide-react';

interface AddPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddParty: (party: Omit<Party, 'id'>) => void;
}

export const AddPartyModal: React.FC<AddPartyModalProps> = ({
  isOpen,
  onClose,
  onAddParty,
}) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [businessType, setBusinessType] = useState('হোলসেল গার্মেন্টস');
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [creditLimit, setCreditLimit] = useState<number>(100000);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile) return;

    onAddParty({
      name,
      mobile,
      address: address || 'চকবাজার, ঢাকা',
      business_type: businessType,
      current_balance: Number(initialBalance) || 0,
      credit_limit: Number(creditLimit) || 100000,
      last_transaction_date: new Date().toLocaleDateString('en-GB'),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between p-5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-lg">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">নতুন কাস্টমার / পার্টি নিবন্ধন</h3>
              <p className="text-xs text-slate-400">নতুন খাতা তৈরি করতে তথ্য দিন</p>
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
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              পার্টি বা প্রতিষ্ঠানের নাম:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="যেমন: মা এন্টারপ্রাইজ"
              required
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-primary-500"
            />
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
              required
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono text-sm focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">ব্যবসার ধরন:</label>
              <input
                type="text"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                placeholder="যেমন: কাপড়ের থান"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">ঠিকানা / এলাকা:</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ইসলামপুর, ঢাকা"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                পূর্বের জের / বাকি (BDT):
              </label>
              <input
                type="number"
                value={initialBalance || ''}
                onChange={(e) => setInitialBalance(Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-400 font-bold text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ক্রেডিট লিমিট (BDT):
              </label>
              <input
                type="number"
                value={creditLimit || ''}
                onChange={(e) => setCreditLimit(Number(e.target.value))}
                placeholder="100000"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 font-bold text-sm text-white rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 mt-2"
          >
            <Check className="w-4 h-4" />
            <span>কাস্টমার সেভ করুন</span>
          </button>
        </form>
      </div>
    </div>
  );
};
