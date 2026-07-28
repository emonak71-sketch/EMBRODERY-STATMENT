import React from 'react';
import { OverallSummary } from '../types';
import { Wallet, TrendingUp, TrendingDown, Users, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface SummaryHeaderProps {
  summary: OverallSummary;
  onOpenAIMemoModal: () => void;
  onOpenManualModal: () => void;
}

export const SummaryHeader: React.FC<SummaryHeaderProps> = ({
  summary,
  onOpenAIMemoModal,
  onOpenManualModal,
}) => {
  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Receivable (মোট পাওনা / বাকি) */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all text-amber-500">
          <Wallet className="w-16 h-16" />
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            মোট পাওনা / বাকি (Total Receivable)
          </span>
          <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ArrowUpRight className="w-4 h-4" />
          </span>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight my-1">
          ৳ {summary.total_receivable.toLocaleString('bn-BD')}
        </div>
        <p className="text-[11px] text-slate-500 flex items-center space-x-1">
          <span>সকল পার্টির বর্তমান অনাদায়ী দেনার সমষ্টি</span>
        </p>
      </div>

      {/* 2. Total Weekly Collection (সাপ্তাহিক কালেকশন) */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all text-emerald-500">
          <TrendingDown className="w-16 h-16" />
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            সাপ্তাহিক আদায় (Weekly Collection)
          </span>
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ArrowDownLeft className="w-4 h-4" />
          </span>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight my-1">
          ৳ {summary.total_weekly_collection.toLocaleString('bn-BD')}
        </div>
        <p className="text-[11px] text-slate-500">
          চলতি সপ্তাহে মোট আদায়কৃত জমার পরিমাণ
        </p>
      </div>

      {/* 3. Total Weekly Baki Deliveries */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all text-primary-500">
          <TrendingUp className="w-16 h-16" />
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            সাপ্তাহিক বাকি চালান
          </span>
          <span className="p-2 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20">
            <TrendingUp className="w-4 h-4" />
          </span>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-primary-400 font-mono tracking-tight my-1">
          ৳ {summary.total_weekly_baki.toLocaleString('bn-BD')}
        </div>
        <p className="text-[11px] text-slate-500">
          চলতি সপ্তাহে মোট নতুন ডেলিভারি চালান
        </p>
      </div>

      {/* 4. Active Parties & Memos Count */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            সক্রিয় পার্টি ও চালান
          </span>
          <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Users className="w-4 h-4" />
          </span>
        </div>
        <div className="flex items-baseline space-x-3 my-1">
          <span className="text-2xl sm:text-3xl font-black text-slate-100 font-mono">
            {summary.total_parties}
          </span>
          <span className="text-xs text-slate-400 font-medium">জন কাস্টমার</span>
          <span className="text-2xl font-bold text-slate-400 font-mono">|</span>
          <span className="text-2xl sm:text-3xl font-black text-primary-400 font-mono">
            {summary.total_transactions}
          </span>
          <span className="text-xs text-slate-400 font-medium">টি মেমো</span>
        </div>
        <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-slate-800/80">
          <button
            onClick={onOpenAIMemoModal}
            className="flex-1 py-1 px-2 rounded bg-primary-600/20 hover:bg-primary-600/30 text-blue-300 text-[10px] font-bold border border-primary-500/30 text-center transition-all"
          >
            + AI মেমো
          </button>
          <button
            onClick={onOpenManualModal}
            className="flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700 text-center transition-all"
          >
            + পেমেন্ট এন্ট্রি
          </button>
        </div>
      </div>
    </div>
  );
};
