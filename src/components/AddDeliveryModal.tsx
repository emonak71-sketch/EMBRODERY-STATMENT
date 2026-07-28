import React, { useState } from 'react';
import { DeliveryRecord, Party, DeliveryStatus } from '../types';
import { Truck, X, Check, Building, Phone, MapPin, Hash, Package } from 'lucide-react';

interface AddDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  parties: Party[];
  onAddDelivery: (delivery: DeliveryRecord) => void;
}

export const AddDeliveryModal: React.FC<AddDeliveryModalProps> = ({
  isOpen,
  onClose,
  parties,
  onAddDelivery,
}) => {
  const [selectedPartyName, setSelectedPartyName] = useState(parties[0]?.name || '');
  const [memoNo, setMemoNo] = useState(`#MEMO-${Math.floor(1000 + Math.random() * 9000)}`);
  const [courierPartner, setCourierPartner] = useState('Pathao Courier / পাঠাও এক্সপ্রেস');
  const [trackingCode, setTrackingCode] = useState(`TRK-${Math.floor(100000 + Math.random() * 900000)}`);
  const [pcs, setPcs] = useState<number>(50);
  const [totalAmount, setTotalAmount] = useState<number>(22500);
  const [address, setAddress] = useState('');
  const [mobile, setMobile] = useState('');

  if (!isOpen) return null;

  const handlePartySelect = (partyName: string) => {
    setSelectedPartyName(partyName);
    const party = parties.find((p) => p.name.trim().toLowerCase() === partyName.trim().toLowerCase());
    if (party) {
      setMobile(party.mobile);
      setAddress(party.address);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentParty = parties.find((p) => p.name === selectedPartyName);
    const finalMobile = mobile || currentParty?.mobile || '01700000000';
    const finalAddress = address || currentParty?.address || 'ঢাকা';
    const delId = `DEL-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRecord: DeliveryRecord = {
      id: delId,
      memo_no: memoNo || `#MEMO-${Math.floor(1000 + Math.random() * 9000)}`,
      party_name: selectedPartyName || 'নতুন পার্টি',
      mobile: finalMobile,
      address: finalAddress,
      courier_partner: courierPartner,
      tracking_code: trackingCode,
      pcs: Number(pcs) || 0,
      total_amount: Number(totalAmount) || 0,
      current_status: 'Pending',
      status_history: [
        {
          status: 'Pending',
          timestamp: new Date().toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
          location: 'সেন্ট্রাল ওয়্যারহাউজ',
          note: 'নতুন বুকিং সম্পন্ন ও প্যাকিং স্টার্ট',
          updated_by: 'এডমিন',
        },
      ],
      sms_draft: `প্রিয় ${selectedPartyName}, আপনার মেমো ${memoNo} (ডেলিভারি ID: ${delId}) প্রসেসিং চলছে (স্ট্যাটাস: Pending)। কুরিয়ার: ${courierPartner}। ধন্যবাদ - হিসাব খাতা 3D`,
      created_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
    };

    onAddDelivery(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between p-5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary-600 text-white shadow-lg">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">নতুন ডেলিভারি এন্ট্রি যুক্ত করুন</h3>
              <p className="text-xs text-slate-400">কুরিয়ার ও চালানি ট্র্যাকিং আইডি বুকিং</p>
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">পার্টি / কাস্টমার সিলেক্ট করুন:</label>
            <select
              value={selectedPartyName}
              onChange={(e) => handlePartySelect(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-primary-500"
            >
              {parties.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} ({p.mobile})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">মেমো নং:</label>
              <input
                type="text"
                value={memoNo}
                onChange={(e) => setMemoNo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono text-xs focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">কুরিয়ার পার্টনার:</label>
              <select
                value={courierPartner}
                onChange={(e) => setCourierPartner(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-primary-500"
              >
                <option value="Pathao Courier / পাঠাও এক্সপ্রেস">Pathao Courier</option>
                <option value="Steadfast Courier / স্টিডফাস্ট">Steadfast Courier</option>
                <option value="S A Parivahan / এস এ পরিবহন">S A Parivahan</option>
                <option value="Paperfly / পেপারফ্লাই">Paperfly</option>
                <option value="Sundarban Courier / সুন্দরবন">Sundarban Courier</option>
                <option value="Internal Van / নিজস্ব গাড়ি">Internal Delivery Van</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">ট্র্যাকিং কোড:</label>
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono text-xs focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">পরিমাণ (pcs):</label>
              <input
                type="number"
                value={pcs}
                onChange={(e) => setPcs(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">মোট চালানি মূল্য (BDT):</label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-amber-400 font-bold text-sm focus:outline-none focus:border-primary-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-500 font-bold text-sm text-white rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 mt-2"
          >
            <Check className="w-4 h-4" />
            <span>ডেলিভারি বুকিং সেভ করুন</span>
          </button>
        </form>
      </div>
    </div>
  );
};
