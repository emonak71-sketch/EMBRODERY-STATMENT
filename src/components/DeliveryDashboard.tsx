import React, { useState } from 'react';
import { DeliveryRecord, DeliveryStatus, Party } from '../types';
import { UpdateDeliveryStatusModal } from './UpdateDeliveryStatusModal';
import { AddDeliveryModal } from './AddDeliveryModal';
import {
  Truck,
  Package,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Copy,
  Check,
  MapPin,
  Phone,
  FileText,
  Code,
  Share2,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface DeliveryDashboardProps {
  deliveries: DeliveryRecord[];
  parties: Party[];
  onUpdateDeliveryStatus: (
    deliveryId: string,
    newStatus: DeliveryStatus,
    location: string,
    note: string,
    smsDraft: string
  ) => void;
  onAddDelivery: (delivery: DeliveryRecord) => void;
  onSelectMemoFor3D?: (memoNo: string) => void;
}

export const DeliveryDashboard: React.FC<DeliveryDashboardProps> = ({
  deliveries,
  parties,
  onUpdateDeliveryStatus,
  onAddDelivery,
  onSelectMemoFor3D,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(
    deliveries.length > 0 ? deliveries[0].id : null
  );

  // Modals
  const [updatingDelivery, setUpdatingDelivery] = useState<DeliveryRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [copiedSMSId, setCopiedSMSId] = useState<string | null>(null);
  const [copiedJSONId, setCopiedJSONId] = useState<string | null>(null);
  const [showJSONModal, setShowJSONModal] = useState<DeliveryRecord | null>(null);

  // Filter deliveries
  const filteredDeliveries = deliveries.filter((d) => {
    const matchesSearch =
      d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.memo_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.mobile.includes(searchTerm) ||
      (d.tracking_code && d.tracking_code.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' ? true : d.current_status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // KPI Calculations
  const totalCount = deliveries.length;
  const pendingCount = deliveries.filter((d) => d.current_status === 'Pending').length;
  const dispatchedCount = deliveries.filter((d) => d.current_status === 'Dispatched').length;
  const outForDeliveryCount = deliveries.filter((d) => d.current_status === 'Out for Delivery').length;
  const deliveredCount = deliveries.filter((d) => d.current_status === 'Delivered').length;
  const returnedCount = deliveries.filter((d) => d.current_status === 'Returned' || d.current_status === 'Cancelled').length;

  const activeSelectedDelivery = deliveries.find((d) => d.id === selectedDeliveryId) || filteredDeliveries[0] || deliveries[0];

  const getStatusBadgeClass = (status: DeliveryStatus) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Out for Delivery':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Dispatched':
        return 'bg-primary-500/10 text-primary-400 border-primary-500/30';
      case 'Pending':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'Returned':
      case 'Cancelled':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusLabelBn = (status: DeliveryStatus) => {
    switch (status) {
      case 'Delivered':
        return 'Delivered (পৌঁছেছে)';
      case 'Out for Delivery':
        return 'Out for Delivery (ডেলিভারিতে)';
      case 'Dispatched':
        return 'Dispatched (রওয়ানা)';
      case 'Pending':
        return 'Pending (প্যাকিং)';
      case 'Returned':
        return 'Returned (ফেরত)';
      case 'Cancelled':
        return 'Cancelled (বাতিল)';
    }
  };

  const handleCopySMS = (delivery: DeliveryRecord) => {
    navigator.clipboard.writeText(delivery.sms_draft);
    setCopiedSMSId(delivery.id);
    setTimeout(() => setCopiedSMSId(null), 2000);
  };

  const handleCopyJSON = (delivery: DeliveryRecord) => {
    const jsonOutput = {
      delivery_id: delivery.id,
      memo_no: delivery.memo_no,
      customer_details: {
        party_name: delivery.party_name,
        mobile: delivery.mobile,
        delivery_address: delivery.address,
      },
      logistics: {
        courier_partner: delivery.courier_partner,
        tracking_code: delivery.tracking_code || 'N/A',
        pcs: delivery.pcs,
        total_amount: delivery.total_amount,
      },
      status_info: {
        current_status: delivery.current_status,
        last_updated: delivery.last_updated_at,
        history: delivery.status_history,
      },
      sms_draft: delivery.sms_draft,
    };
    navigator.clipboard.writeText(JSON.stringify(jsonOutput, null, 2));
    setCopiedJSONId(delivery.id);
    setTimeout(() => setCopiedJSONId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 1. Header Banner & Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 shadow-2xl">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-primary-600 rounded-2xl text-white shadow-lg shadow-primary-500/20">
            <Truck className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-slate-100 tracking-tight">
                ডেলিভারি স্ট্যাটাস ট্র্যাকিং ড্যাশবোর্ড
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-primary-500/20 text-blue-300 border border-primary-500/30 rounded-full">
                LIVE LOGISTICS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              ডেলিভারি ID দিয়ে স্ট্যাটাস ট্র্যাকিং, অটোমেটিক কাস্টমার SMS ড্রাফটিং ও ডেভালপার JSON আউটপুট
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ নতুন চালানি / কুরিয়ার বুকিং</span>
        </button>
      </div>

      {/* 2. Top KPI Analytics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 border-primary-500 shadow-xl ring-1 ring-primary-500/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            মোট চালানি
          </span>
          <div className="text-2xl font-black text-slate-100 font-mono">{totalCount}</div>
          <span className="text-[10px] text-slate-500 mt-1 block">সকল বুকিং</span>
        </button>

        <button
          onClick={() => setStatusFilter('Pending')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'Pending'
              ? 'bg-slate-900 border-purple-500 shadow-xl ring-1 ring-purple-500/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1">
            প্যাকিং (Pending)
          </span>
          <div className="text-2xl font-black text-purple-400 font-mono">{pendingCount}</div>
          <span className="text-[10px] text-slate-500 mt-1 block">ওয়্যারহাউজে আছে</span>
        </button>

        <button
          onClick={() => setStatusFilter('Dispatched')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'Dispatched'
              ? 'bg-slate-900 border-primary-500 shadow-xl ring-1 ring-primary-500/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider block mb-1">
            Dispatched
          </span>
          <div className="text-2xl font-black text-primary-400 font-mono">{dispatchedCount}</div>
          <span className="text-[10px] text-slate-500 mt-1 block">কুরিয়ারে রওয়ানা</span>
        </button>

        <button
          onClick={() => setStatusFilter('Out for Delivery')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'Out for Delivery'
              ? 'bg-slate-900 border-amber-500 shadow-xl ring-1 ring-amber-500/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
            Out for Delivery
          </span>
          <div className="text-2xl font-black text-amber-400 font-mono">{outForDeliveryCount}</div>
          <span className="text-[10px] text-slate-500 mt-1 block">রাইডারের সাথে</span>
        </button>

        <button
          onClick={() => setStatusFilter('Delivered')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'Delivered'
              ? 'bg-slate-900 border-emerald-500 shadow-xl ring-1 ring-emerald-500/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
            Delivered
          </span>
          <div className="text-2xl font-black text-emerald-400 font-mono">{deliveredCount}</div>
          <span className="text-[10px] text-slate-500 mt-1 block">সফলভাবে রিসিভড</span>
        </button>

        <button
          onClick={() => setStatusFilter('Returned')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'Returned'
              ? 'bg-slate-900 border-rose-500 shadow-xl ring-1 ring-rose-500/30'
              : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
            Returned / সমস্যা
          </span>
          <div className="text-2xl font-black text-rose-400 font-mono">{returnedCount}</div>
          <span className="text-[10px] text-slate-500 mt-1 block">ফেরত বা হোল্ড</span>
        </button>
      </div>

      {/* 3. Search Bar and Direct Tracking Lookup */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ডেলিভারি ID (যেমন DEL-1024), মেমো নং (#MEMO-1024), কাস্টমার বা মোবাইল নং সার্চ করুন..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'Pending', 'Dispatched', 'Out for Delivery', 'Delivered', 'Returned'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st === 'ALL' ? 'সকল চালানি' : st}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Active Selected Parcel - Visual Stepper Timeline Spotlight Card */}
      {activeSelectedDelivery && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black text-primary-400 font-mono uppercase bg-primary-500/10 px-2.5 py-1 rounded-lg border border-primary-500/20">
                  {activeSelectedDelivery.id}
                </span>
                <span className="text-xs font-extrabold text-slate-400 font-mono">
                  {activeSelectedDelivery.memo_no}
                </span>
                <span
                  className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${getStatusBadgeClass(
                    activeSelectedDelivery.current_status
                  )}`}
                >
                  {getStatusLabelBn(activeSelectedDelivery.current_status)}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-100 mt-1">
                {activeSelectedDelivery.party_name}{' '}
                <span className="text-xs text-slate-400 font-normal">({activeSelectedDelivery.mobile})</span>
              </h3>
              <p className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>{activeSelectedDelivery.address}</span>
                <span className="text-slate-600">|</span>
                <span>কুরিয়ার: {activeSelectedDelivery.courier_partner}</span>
                {activeSelectedDelivery.tracking_code && (
                  <span className="font-mono text-primary-400 ml-1">({activeSelectedDelivery.tracking_code})</span>
                )}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setUpdatingDelivery(activeSelectedDelivery)}
                className="px-3.5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>স্ট্যাটাস আপডেট করুন</span>
              </button>
              <button
                onClick={() => setShowJSONModal(activeSelectedDelivery)}
                className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-slate-800 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
              >
                <Code className="w-3.5 h-3.5 text-indigo-400" />
                <span>Dev JSON</span>
              </button>
            </div>
          </div>

          {/* Graphical Timeline Stepper (Pending ➔ Dispatched ➔ Out for Delivery ➔ Delivered) */}
          <div className="py-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-primary-400" />
              <span>ডেলিভারি প্রগ্রেস টাইমলাইন (Real-Time Timeline Nodes)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {['Pending', 'Dispatched', 'Out for Delivery', 'Delivered'].map((stepStatus, idx) => {
                const isCompleted =
                  activeSelectedDelivery.current_status === stepStatus ||
                  activeSelectedDelivery.status_history.some((h) => h.status === stepStatus);

                const isCurrent = activeSelectedDelivery.current_status === stepStatus;

                const stepEntry = activeSelectedDelivery.status_history.find((h) => h.status === stepStatus);

                return (
                  <div
                    key={stepStatus}
                    className={`p-4 rounded-xl border transition-all relative ${
                      isCurrent
                        ? 'bg-blue-950/40 border-primary-500/80 shadow-lg ring-1 ring-primary-500/30'
                        : isCompleted
                        ? 'bg-slate-950/80 border-slate-800'
                        : 'bg-slate-950/30 border-slate-800/40 opacity-40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-extrabold font-mono text-slate-500">STEP 0{idx + 1}</span>
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          isCompleted
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                      </div>
                    </div>

                    <div className="text-xs font-bold text-slate-200">{stepStatus}</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {stepStatus === 'Pending' && 'প্যাকিং ও ইনভেন্টরি লক'}
                      {stepStatus === 'Dispatched' && 'কুরিয়ারে হস্তান্তর'}
                      {stepStatus === 'Out for Delivery' && 'রাইডার সহ চকবাজার/গন্তব্য রওনা'}
                      {stepStatus === 'Delivered' && 'কাস্টমার রিসিভড'}
                    </p>

                    {stepEntry && (
                      <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1">
                        <p className="text-[10px] text-slate-500 flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{stepEntry.timestamp}</span>
                        </p>
                        {stepEntry.location && (
                          <p className="text-[10px] text-slate-400 flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-amber-500/80" />
                            <span>{stepEntry.location}</span>
                          </p>
                        )}
                        {stepEntry.note && (
                          <p className="text-[10px] text-slate-300 italic bg-slate-900 p-1.5 rounded border border-slate-800">
                            "{stepEntry.note}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer SMS Box */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>কাস্টমার মোবাইল SMS আপডেট (অটো-জেনারেটেড)</span>
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleCopySMS(activeSelectedDelivery)}
                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition-all flex items-center space-x-1"
                >
                  {copiedSMSId === activeSelectedDelivery.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {copiedSMSId === activeSelectedDelivery.id ? 'Copied SMS!' : 'Copy SMS Text'}
                  </span>
                </button>
              </div>
            </div>

            <p className="text-xs text-amber-200 font-mono bg-slate-900/90 p-3 rounded-lg border border-slate-800 leading-relaxed">
              {activeSelectedDelivery.sms_draft}
            </p>
          </div>
        </div>
      )}

      {/* 5. Full Deliveries Tracking Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
            <Package className="w-4 h-4 text-primary-400" />
            <span>সকল ডেলিভারি ও চালানি রেকর্ড তালিকা ({filteredDeliveries.length})</span>
          </h3>
          <span className="text-xs text-slate-400">স্ট্যাটাস পরিবর্তনের জন্য ক্লিক করুন</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">ডেলিভারি ID / মেমো</th>
                <th className="px-4 py-3">কাস্টমার / ঠিকানা</th>
                <th className="px-4 py-3">কুরিয়ার ও ট্র্যাকিং</th>
                <th className="px-4 py-3 text-right">পরিমাণ ও মূল্য</th>
                <th className="px-4 py-3">বর্তমান স্ট্যাটাস</th>
                <th className="px-4 py-3 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredDeliveries.map((del) => {
                const isSelected = selectedDeliveryId === del.id;
                return (
                  <tr
                    key={del.id}
                    onClick={() => setSelectedDeliveryId(del.id)}
                    className={`hover:bg-slate-800/50 cursor-pointer transition-all ${
                      isSelected ? 'bg-blue-950/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-mono font-bold text-primary-400">{del.id}</div>
                      <div className="font-mono text-[11px] text-slate-400">{del.memo_no}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-200">{del.party_name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{del.mobile}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{del.address}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="text-slate-200 font-medium">{del.courier_partner}</div>
                      {del.tracking_code && (
                        <div className="font-mono text-[10px] text-primary-400">
                          {del.tracking_code}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="font-bold text-slate-200">{del.pcs} পিস</div>
                      <div className="font-mono text-amber-400 font-bold">
                        ৳ {del.total_amount.toLocaleString('bn-BD')}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full border text-[11px] font-bold ${getStatusBadgeClass(
                          del.current_status
                        )}`}
                      >
                        {getStatusLabelBn(del.current_status)}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => setUpdatingDelivery(del)}
                          className="p-1.5 bg-primary-600/20 hover:bg-primary-600/30 text-blue-300 border border-primary-500/30 rounded-lg text-[10px] font-bold transition-all flex items-center space-x-1"
                          title="স্ট্যাটাস আপডেট"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>আপডেট</span>
                        </button>

                        <button
                          onClick={() => handleCopySMS(del)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] transition-all"
                          title="SMS কপি করুন"
                        >
                          {copiedSMSId === del.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => setShowJSONModal(del)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-lg text-[10px] transition-all"
                          title="Dev JSON দেখুন"
                        >
                          <Code className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredDeliveries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    কোনো ডেলিভারি রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Status Modal */}
      <UpdateDeliveryStatusModal
        isOpen={!!updatingDelivery}
        onClose={() => setUpdatingDelivery(null)}
        delivery={updatingDelivery}
        onUpdateStatus={onUpdateDeliveryStatus}
      />

      {/* Add New Delivery Modal */}
      <AddDeliveryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        parties={parties}
        onAddDelivery={onAddDelivery}
      />

      {/* Developer Output JSON Modal */}
      {showJSONModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Code className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Developer Output JSON ({showJSONModal.id})
                </h3>
              </div>
              <button
                onClick={() => setShowJSONModal(null)}
                className="p-1 text-slate-400 hover:text-slate-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed max-h-80">
              {JSON.stringify(
                {
                  delivery_id: showJSONModal.id,
                  memo_no: showJSONModal.memo_no,
                  customer_details: {
                    party_name: showJSONModal.party_name,
                    mobile: showJSONModal.mobile,
                    delivery_address: showJSONModal.address,
                  },
                  logistics: {
                    courier_partner: showJSONModal.courier_partner,
                    tracking_code: showJSONModal.tracking_code || 'N/A',
                    pcs: showJSONModal.pcs,
                    total_amount: showJSONModal.total_amount,
                  },
                  status_info: {
                    current_status: showJSONModal.current_status,
                    last_updated: showJSONModal.last_updated_at,
                    history: showJSONModal.status_history,
                  },
                  sms_draft: showJSONModal.sms_draft,
                },
                null,
                2
              )}
            </pre>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => handleCopyJSON(showJSONModal)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
              >
                {copiedJSONId === showJSONModal.id ? (
                  <Check className="w-4 h-4 text-emerald-300" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>
                  {copiedJSONId === showJSONModal.id ? 'Copied JSON!' : 'Copy Formatted JSON'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
