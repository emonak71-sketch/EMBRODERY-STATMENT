import React, { useState } from 'react';
import { DeliveryRecord, DeliveryStatus } from '../types';
import {
  Truck,
  X,
  Check,
  MapPin,
  FileText,
  MessageSquare,
  Copy,
  Sparkles,
  Loader2,
  Clock,
} from 'lucide-react';

interface UpdateDeliveryStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: DeliveryRecord | null;
  onUpdateStatus: (
    deliveryId: string,
    newStatus: DeliveryStatus,
    location: string,
    note: string,
    smsDraft: string
  ) => void;
}

export const UpdateDeliveryStatusModal: React.FC<UpdateDeliveryStatusModalProps> = ({
  isOpen,
  onClose,
  delivery,
  onUpdateStatus,
}) => {
  if (!isOpen || !delivery) return null;

  const [status, setStatus] = useState<DeliveryStatus>(delivery.current_status);
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [customSms, setCustomSms] = useState(delivery.sms_draft || '');
  const [isGeneratingSms, setIsGeneratingSms] = useState(false);
  const [copiedSms, setCopiedSms] = useState(false);

  const statuses: { label: string; value: DeliveryStatus; color: string }[] = [
    { label: 'Pending (প্যাকিং চলছে)', value: 'Pending', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    { label: 'Dispatched (কুরিয়ারে রওয়ানা)', value: 'Dispatched', color: 'bg-primary-500/10 text-primary-400 border-primary-500/30' },
    { label: 'Out for Delivery (ডেলিভারিতে আছে)', value: 'Out for Delivery', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' },
    { label: 'Delivered (সফলভাবে পৌঁছানো)', value: 'Delivered', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    { label: 'Returned (ফেরত গেছে)', value: 'Returned', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
    { label: 'Cancelled (বাতিল)', value: 'Cancelled', color: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
  ];

  const handleGenerateAISms = async () => {
    setIsGeneratingSms(true);
    try {
      const res = await fetch('/api/delivery-status-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_id: delivery.id,
          memo_no: delivery.memo_no,
          party_name: delivery.party_name,
          mobile: delivery.mobile,
          address: delivery.address,
          courier_partner: delivery.courier_partner,
          tracking_code: delivery.tracking_code,
          pcs: delivery.pcs,
          total_amount: delivery.total_amount,
          new_status: status,
          location: location || delivery.address,
          note: note,
        }),
      });

      const json = await res.json();
      if (json.success && json.data?.sms_draft) {
        setCustomSms(json.data.sms_draft);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingSms(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateStatus(
      delivery.id,
      status,
      location || (status === 'Delivered' ? 'কাস্টমার পয়েন্ট' : 'কুরিয়ার প্রসেসিং'),
      note || `স্ট্যাটাস পরিবর্তন: ${status}`,
      customSms
    );
    onClose();
  };

  const handleCopySMS = () => {
    navigator.clipboard.writeText(customSms);
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between p-5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary-600 text-white shadow-lg">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                ডেলিভারি স্ট্যাটাস আপডেট ({delivery.id})
              </h3>
              <p className="text-xs text-slate-400">
                মেমো: {delivery.memo_no} • কাস্টমার: {delivery.party_name}
              </p>
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
          {/* Select New Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              নতুন ডেলিভারি স্ট্যাটাস নির্বাচন করুন:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {statuses.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => {
                    setStatus(s.value);
                  }}
                  className={`p-2.5 text-xs font-bold rounded-xl border text-left transition-all ${
                    status === s.value
                      ? 'bg-primary-600 text-white border-primary-400 shadow-md ring-2 ring-primary-500/20'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Current Location / Hub */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              বর্তমান অবস্থান / কুরিয়ার পয়েন্ট (Location):
            </label>
            <div className="relative">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="যেমন: চকবাজার হাব / কেরানীগঞ্জ ব্রাঞ্চ / বগুড়া কাউন্টার"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-primary-500"
              />
              <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Note / Rider Remark */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              রাইডার বা ডেলিভারি নোট (নোট/মন্তব্য):
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="যেমন: রাইডার রওনা দিয়েছে / দোকানে পৌঁছে ডেলিভারি রিসিভ করানো হয়েছে"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Generated Customer SMS Draft */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>কাস্টমার SMS মেসেজ ড্রাফট</span>
              </span>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={handleGenerateAISms}
                  disabled={isGeneratingSms}
                  className="px-2 py-1 bg-primary-600/20 hover:bg-primary-600/30 text-blue-300 border border-primary-500/30 rounded text-[10px] font-bold transition-all flex items-center space-x-1"
                >
                  {isGeneratingSms ? (
                    <Loader2 className="w-3 h-3 animate-spin text-blue-300" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-amber-300" />
                  )}
                  <span>AI দিয়ে রি-রাইট করুন</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopySMS}
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition-all"
                  title="SMS কপি করুন"
                >
                  {copiedSms ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <textarea
              rows={3}
              value={customSms}
              onChange={(e) => setCustomSms(e.target.value)}
              className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-amber-300 font-mono leading-relaxed focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Save Action */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-300 rounded-xl transition-all"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-primary-600 hover:bg-primary-500 font-bold text-xs text-white rounded-xl shadow-lg transition-all flex items-center justify-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>স্ট্যাটাস সেভ ও আপডেট করুন</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
