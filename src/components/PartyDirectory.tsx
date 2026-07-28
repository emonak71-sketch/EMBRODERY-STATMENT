import React, { useState } from 'react';
import { Party } from '../types';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  AlertTriangle,
  Send,
  Eye,
  CheckCircle,
  Building,
  TrendingUp,
} from 'lucide-react';

interface PartyDirectoryProps {
  parties: Party[];
  selectedPartyId: string | null;
  onSelectParty: (partyId: string | null) => void;
  onOpenNewPartyModal: () => void;
  onOpenPaymentModalForParty: (partyName: string) => void;
}

export const PartyDirectory: React.FC<PartyDirectoryProps> = ({
  parties,
  selectedPartyId,
  onSelectParty,
  onOpenNewPartyModal,
  onOpenPaymentModalForParty,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredParties = parties.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mobile.includes(searchTerm) ||
      p.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">কাস্টমার / পার্টি ডিরেক্টরি</h3>
            <p className="text-xs text-slate-400">সকল পাইকারী ও খুচরা কাস্টমারের খাতা ও ক্রেডিট লিমিট</p>
          </div>
        </div>

        <button
          onClick={onOpenNewPartyModal}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন কাস্টমার যোগ করুন</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-4 bg-slate-900/60 border-b border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="কাস্টমার নাম, মোবাইল বা ঠিকানা দিয়ে ডিরেক্টরি সার্চ করুন..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-primary-500 placeholder-slate-600"
          />
        </div>
      </div>

      {/* Grid of Party Cards */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredParties.map((party) => {
          const isSelected = party.id === selectedPartyId;
          const limit = party.credit_limit || 100000;
          const usagePercent = Math.min(100, Math.round((party.current_balance / limit) * 100));

          let statusBadge = (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              নরমাল বাকি
            </span>
          );

          if (usagePercent > 80) {
            statusBadge = (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                ক্রেডিট লিমিট সতর্কাবস্থা
              </span>
            );
          } else if (party.current_balance === 0) {
            statusBadge = (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-500/10 text-primary-400 border border-primary-500/20">
                পরিশোধিত (০ বাকি)
              </span>
            );
          }

          return (
            <div
              key={party.id}
              className={`p-4 rounded-xl border transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-blue-950/40 border-primary-500 shadow-lg'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm">{party.name}</h4>
                    <span className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                      <Building className="w-3 h-3 inline" />
                      <span>{party.business_type || 'পাইকারী কাস্টমার'}</span>
                    </span>
                  </div>
                  {statusBadge}
                </div>

                <div className="space-y-1 text-xs text-slate-400 my-3">
                  <div className="flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono text-slate-300">{party.mobile}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{party.address}</span>
                  </div>
                </div>

                {/* Balance Stats */}
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 mb-3">
                  <div className="flex justify-between items-center mb-1 text-xs">
                    <span className="text-slate-400">বর্তমান মোট বাকি:</span>
                    <span className="font-extrabold text-amber-400 text-sm font-mono">
                      ৳ {party.current_balance.toLocaleString('bn-BD')}
                    </span>
                  </div>

                  {/* Credit limit bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full transition-all ${
                        usagePercent > 80 ? 'bg-red-500' : 'bg-primary-500'
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>লিমিট: ৳ {limit.toLocaleString('bn-BD')}</span>
                    <span>{usagePercent}% ব্যবহৃত</span>
                  </div>
                </div>
              </div>

              {/* Card Bottom Actions */}
              <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => onSelectParty(party.id)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-1 ${
                    isSelected
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>লেজার ফিল্টার</span>
                </button>

                <button
                  onClick={() => onOpenPaymentModalForParty(party.name)}
                  className="py-1.5 px-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all"
                  title="জমা বা পেমেন্ট যোগ করুন"
                >
                  + পেমেন্ট জমা
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
