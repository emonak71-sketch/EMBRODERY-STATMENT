import React, { useState, useEffect } from 'react';
import { Party, TransactionEntry, OverallSummary, DeliveryRecord, DeliveryStatus } from './types';
import { INITIAL_PARTIES, INITIAL_TRANSACTIONS, INITIAL_DELIVERIES } from './data/initialData';
import { Ledger3DVisualizer } from './components/Ledger3DVisualizer';
import { LedgerTable } from './components/LedgerTable';
import { PartyDirectory } from './components/PartyDirectory';
import { DeliveryDashboard } from './components/DeliveryDashboard';
import { SummaryHeader } from './components/SummaryHeader';
import { AIMemoModal } from './components/AIMemoModal';
import { ManualTransactionModal } from './components/ManualTransactionModal';
import { AddPartyModal } from './components/AddPartyModal';
import { MemoPrintModal } from './components/MemoPrintModal';
import {
  Sparkles,
  Box,
  FileSpreadsheet,
  Users,
  Truck,
  Plus,
  RefreshCcw,
  Download,
  Upload,
  Code,
  Smartphone,
  ShieldCheck,
  Check,
} from 'lucide-react';

export default function App() {
  // State initialization with localStorage persistence
  const [parties, setParties] = useState<Party[]>(() => {
    const saved = localStorage.getItem('hk3d_parties');
    return saved ? JSON.parse(saved) : INITIAL_PARTIES;
  });

  const [transactions, setTransactions] = useState<TransactionEntry[]>(() => {
    const saved = localStorage.getItem('hk3d_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>(() => {
    const saved = localStorage.getItem('hk3d_deliveries');
    return saved ? JSON.parse(saved) : INITIAL_DELIVERIES;
  });

  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    '3d-view' | 'ledger-table' | 'parties' | 'delivery-dashboard' | 'json-api'
  >('3d-view');

  // Modals state
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
  const [printTransaction, setPrintTransaction] = useState<TransactionEntry | null>(null);
  const [defaultManualPartyName, setDefaultManualPartyName] = useState('');

  // Developer JSON inspect modal / tab state
  const [latestJSONOutput, setLatestJSONOutput] = useState<any | null>(null);
  const [copiedDeveloperJSON, setCopiedDeveloperJSON] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('hk3d_parties', JSON.stringify(parties));
  }, [parties]);

  useEffect(() => {
    localStorage.setItem('hk3d_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('hk3d_deliveries', JSON.stringify(deliveries));
  }, [deliveries]);

  // Core Math Calculation Rules:
  // 1. Total Receivable = Sum of all individual party current balances.
  const totalReceivable = parties.reduce((sum, p) => sum + Math.max(0, p.current_balance), 0);

  // 2. Total Weekly Collection = Sum of all weekly payment entries within current week.
  const totalWeeklyCollection = transactions
    .filter((tx) => tx.transaction_type === 'PAYMENT (-)')
    .reduce((sum, tx) => sum + tx.total_amount, 0);

  const totalWeeklyBaki = transactions
    .filter((tx) => tx.transaction_type === 'BAKI (+)')
    .reduce((sum, tx) => sum + tx.total_amount, 0);

  const activeDeliveriesCount = deliveries.filter((d) => d.current_status !== 'Delivered').length;

  const overallSummary: OverallSummary = {
    total_receivable: totalReceivable,
    total_weekly_collection: totalWeeklyCollection,
    total_weekly_baki: totalWeeklyBaki,
    total_parties: parties.length,
    total_transactions: transactions.length,
    total_deliveries: deliveries.length,
    active_deliveries: activeDeliveriesCount,
  };

  // Add new transaction and update party balance + create delivery record if BAKI
  const handleAddTransaction = (txData: Omit<TransactionEntry, 'id'>) => {
    const newTxId = `tx-${Date.now()}`;
    const delId = `DEL-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTx: TransactionEntry = {
      ...txData,
      id: newTxId,
      delivery_id: txData.transaction_type === 'BAKI (+)' ? delId : undefined,
      created_at: new Date().toISOString(),
    };

    setTransactions((prev) => [newTx, ...prev]);

    // Create auto delivery record for BAKI (+) delivery memo
    if (txData.transaction_type === 'BAKI (+)') {
      const partyObj = parties.find(
        (p) => p.name.trim().toLowerCase() === txData.party_name.trim().toLowerCase()
      );

      const newDeliveryRecord: DeliveryRecord = {
        id: delId,
        memo_no: txData.memo_no,
        party_name: txData.party_name,
        mobile: txData.mobile || partyObj?.mobile || '01700000000',
        address: partyObj?.address || 'চকবাজার, ঢাকা',
        courier_partner: 'Pathao Courier / পাঠাও এক্সপ্রেস',
        tracking_code: `PTH-${Math.floor(100000 + Math.random() * 900000)}`,
        pcs: txData.pcs,
        total_amount: txData.total_amount,
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
            note: 'নতুন ডেলিভারি মেমো বুকিং সম্পন্ন',
            updated_by: 'এডমিন',
          },
        ],
        sms_draft: `প্রিয় ${txData.party_name}, আপনার মেমো ${txData.memo_no} (ডেলিভারি ID: ${delId}) প্রসেসিং শুরু হয়েছে (স্ট্যাটাস: Pending)। ধন্যবাদ - হিসাব খাতা 3D`,
        created_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString(),
      };

      setDeliveries((prev) => [newDeliveryRecord, ...prev]);
    }

    // Update existing party or create new party if missing
    setParties((prevParties) => {
      const existingIndex = prevParties.findIndex(
        (p) => p.name.trim().toLowerCase() === txData.party_name.trim().toLowerCase()
      );

      if (existingIndex >= 0) {
        const updated = [...prevParties];
        updated[existingIndex] = {
          ...updated[existingIndex],
          current_balance: txData.updated_balance,
          last_transaction_date: txData.date,
          mobile: txData.mobile || updated[existingIndex].mobile,
        };
        return updated;
      } else {
        // Create new party entry
        const newParty: Party = {
          id: `party-${Date.now()}`,
          name: txData.party_name,
          mobile: txData.mobile || '01700000000',
          address: 'চকবাজার, ঢাকা',
          business_type: 'খুচরা কাস্টমার',
          current_balance: txData.updated_balance,
          credit_limit: 100000,
          last_transaction_date: txData.date,
        };
        return [newParty, ...prevParties];
      }
    });

    // Save developer output for developer JSON inspector
    setLatestJSONOutput({
      party_name: txData.party_name,
      mobile: txData.mobile,
      memo_no: txData.memo_no,
      date: txData.date,
      pcs: txData.pcs,
      rate: txData.rate,
      total_amount: txData.total_amount,
      transaction_type: txData.transaction_type,
      previous_balance: txData.previous_balance,
      updated_balance: txData.updated_balance,
      delivery_id: txData.transaction_type === 'BAKI (+)' ? delId : undefined,
      sms_draft: txData.sms_draft,
    });
  };

  const handleUpdateDeliveryStatus = (
    deliveryId: string,
    newStatus: DeliveryStatus,
    location: string,
    note: string,
    smsDraft: string
  ) => {
    const timestamp = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.id === deliveryId) {
          const updatedHistory = [
            ...d.status_history,
            {
              status: newStatus,
              timestamp,
              location,
              note,
              updated_by: 'এডমিন',
            },
          ];
          return {
            ...d,
            current_status: newStatus,
            status_history: updatedHistory,
            sms_draft: smsDraft || d.sms_draft,
            last_updated_at: new Date().toISOString(),
          };
        }
        return d;
      })
    );
  };

  const handleAddDelivery = (newDelivery: DeliveryRecord) => {
    setDeliveries((prev) => [newDelivery, ...prev]);
  };

  const handleAddParty = (partyData: Omit<Party, 'id'>) => {
    const newParty: Party = {
      ...partyData,
      id: `party-${Date.now()}`,
    };
    setParties((prev) => [newParty, ...prev]);
  };

  const handleResetDemoData = () => {
    if (confirm('আপনি কি হিসাব খাতার সকল ডাটা রিসেট করে ডেমো ডাটায় ফেরত যেতে চান?')) {
      setParties(INITIAL_PARTIES);
      setTransactions(INITIAL_TRANSACTIONS);
      setDeliveries(INITIAL_DELIVERIES);
      localStorage.removeItem('hk3d_parties');
      localStorage.removeItem('hk3d_transactions');
      localStorage.removeItem('hk3d_deliveries');
    }
  };

  const handleExportJSON = () => {
    const exportData = {
      parties,
      transactions,
      deliveries,
      exported_at: new Date().toISOString(),
      app: 'Hisaab Khata 3D AI Engine',
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hisaab_khata_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.parties && parsed.transactions) {
            setParties(parsed.parties);
            setTransactions(parsed.transactions);
            if (parsed.deliveries) setDeliveries(parsed.deliveries);
            alert('ব্যাকআপ সফলভাবে ইমপোর্ট হয়েছে!');
          }
        } catch (err) {
          alert('ইমপোর্ট ফাইলটি সঠিক JSON ফরম্যাটে নেই।');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleOpenPaymentForParty = (partyName: string) => {
    setDefaultManualPartyName(partyName);
    setIsManualModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-16">
      {/* Top Main Navigation Header */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-lg border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Logo Branding */}
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-primary-600 via-slate-800 to-slate-700 text-white shadow-lg shadow-primary-500/20">
              <Box className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black text-slate-100 tracking-tight uppercase">
                  Embrodery <span className="text-primary-500 font-sans">Statement</span>
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-primary-500/10 text-primary-400 border border-primary-500/30 rounded-full uppercase tracking-widest">
                  Professional Ledger
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block uppercase tracking-widest font-bold mt-1">
                Workspace Dashboard
              </p>
            </div>
          </div>

          {/* View Tab Switcher */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 flex-wrap">
            <button
              onClick={() => setActiveTab('3d-view')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 ${
                activeTab === '3d-view'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="w-4 h-4" />
              <span>3D Web UI</span>
            </button>

            <button
              onClick={() => setActiveTab('delivery-dashboard')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 ${
                activeTab === 'delivery-dashboard'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Truck className="w-4 h-4 text-amber-300" />
              <span>ডেলিভারি ড্যাশবোর্ড</span>
              {activeDeliveriesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded-full text-[10px] font-mono">
                  {activeDeliveriesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ledger-table')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 ${
                activeTab === 'ledger-table'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>লেজার খাতা</span>
            </button>

            <button
              onClick={() => setActiveTab('parties')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 ${
                activeTab === 'parties'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>কাস্টমারসমূহ</span>
            </button>

            <button
              onClick={() => setActiveTab('json-api')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 ${
                activeTab === 'json-api'
                  ? 'bg-slate-800 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>Dev JSON API</span>
            </button>
          </div>

          {/* Right Header Backup / Reset Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAIModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-primary-600 to-slate-800 hover:from-primary-500 hover:to-indigo-500 shadow-lg transition-all flex items-center space-x-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>+ AI মেমো প্রসেসর</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 text-xs font-medium transition-all"
              title="ডাটা ব্যাকআপ এক্সপোর্ট করুন"
            >
              <Download className="w-4 h-4" />
            </button>

            <label className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 text-xs font-medium cursor-pointer transition-all" title="ব্যাকআপ ইমপোর্ট করুন">
              <Upload className="w-4 h-4" />
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>

            <button
              onClick={handleResetDemoData}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-800 text-xs font-medium transition-all"
              title="ডেমো ডাটা রিসেট করুন"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Analytics Summary Bar */}
        <SummaryHeader
          summary={overallSummary}
          onOpenAIMemoModal={() => setIsAIModalOpen(true)}
          onOpenManualModal={() => {
            setDefaultManualPartyName('');
            setIsManualModalOpen(true);
          }}
        />

        {/* Tab View 1: 3D Interactive Web Visualizer */}
        {activeTab === '3d-view' && (
          <div className="space-y-6">
            <Ledger3DVisualizer
              parties={parties}
              transactions={transactions}
              selectedPartyId={selectedPartyId}
              onSelectParty={(partyId) => {
                setSelectedPartyId(partyId);
                setActiveTab('ledger-table');
              }}
              onOpenNewTransactionModal={(partyName) => {
                setDefaultManualPartyName(partyName || '');
                setIsManualModalOpen(true);
              }}
            />

            {/* Embedded Quick Ledger Table under 3D Scene */}
            <LedgerTable
              transactions={transactions}
              parties={parties}
              selectedPartyId={selectedPartyId}
              onSelectParty={(pId) => setSelectedPartyId(pId)}
              onOpenPrintMemo={(tx) => setPrintTransaction(tx)}
              onOpenAIMemoModal={() => setIsAIModalOpen(true)}
              onOpenManualModal={() => {
                setDefaultManualPartyName('');
                setIsManualModalOpen(true);
              }}
            />
          </div>
        )}

        {/* Tab View 2: Delivery Status Tracking Dashboard */}
        {activeTab === 'delivery-dashboard' && (
          <DeliveryDashboard
            deliveries={deliveries}
            parties={parties}
            onUpdateDeliveryStatus={handleUpdateDeliveryStatus}
            onAddDelivery={handleAddDelivery}
            onSelectMemoFor3D={(memoNo) => {
              setActiveTab('ledger-table');
            }}
          />
        )}

        {/* Tab View 3: Full Ledger Table View */}
        {activeTab === 'ledger-table' && (
          <LedgerTable
            transactions={transactions}
            parties={parties}
            selectedPartyId={selectedPartyId}
            onSelectParty={(pId) => setSelectedPartyId(pId)}
            onOpenPrintMemo={(tx) => setPrintTransaction(tx)}
            onOpenAIMemoModal={() => setIsAIModalOpen(true)}
            onOpenManualModal={() => {
              setDefaultManualPartyName('');
              setIsManualModalOpen(true);
            }}
          />
        )}

        {/* Tab View 4: Customer Party Directory */}
        {activeTab === 'parties' && (
          <PartyDirectory
            parties={parties}
            selectedPartyId={selectedPartyId}
            onSelectParty={(pId) => setSelectedPartyId(pId)}
            onOpenNewPartyModal={() => setIsAddPartyModalOpen(true)}
            onOpenPaymentModalForParty={handleOpenPaymentForParty}
          />
        )}

        {/* Tab View 5: Developer JSON Output Inspector */}
        {activeTab === 'json-api' && (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Code className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Developer JSON Output Format (Three.js 3D Engine & Delivery System Consumer)
                </h3>
              </div>
              <button
                onClick={() => {
                  const sample = latestJSONOutput || {
                    party_name: "রহিম ট্রেডার্স",
                    mobile: "01711223344",
                    memo_no: "#MEMO-1024",
                    delivery_id: "DEL-1024",
                    date: "27/07/2026",
                    pcs: 100,
                    rate: 450,
                    total_amount: 45000,
                    transaction_type: "BAKI (+)",
                    previous_balance: 33500,
                    updated_balance: 78500,
                    delivery_status: "Out for Delivery",
                    sms_draft: "প্রিয় রহিম ট্রেডার্স, মেমো #MEMO-1024 (ডেলিভারি ID: DEL-1024) এর বর্তমান স্ট্যাটাস: Out for Delivery (চকবাজার, ঢাকা)। কুরিয়ার: Pathao Courier। ধন্যবাদ - হিসাব খাতা 3D"
                  };
                  navigator.clipboard.writeText(JSON.stringify(sample, null, 2));
                  setCopiedDeveloperJSON(true);
                  setTimeout(() => setCopiedDeveloperJSON(false), 2000);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1"
              >
                {copiedDeveloperJSON ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Code className="w-3.5 h-3.5" />}
                <span>{copiedDeveloperJSON ? 'Copied JSON' : 'Copy Primary JSON Output'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              System Output Format: This structured JSON object is formatted for developer integration, 3D logistics animation synchronization, and backend ERP syncing.
            </p>

            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed">
              {JSON.stringify(
                latestJSONOutput || {
                  party_name: "রহিম ট্রেডার্স",
                  mobile: "01711223344",
                  memo_no: "#MEMO-1024",
                  delivery_id: "DEL-1024",
                  date: "27/07/2026",
                  pcs: 100,
                  rate: 450,
                  total_amount: 45000,
                  transaction_type: "BAKI (+)",
                  previous_balance: 33500,
                  updated_balance: 78500,
                  delivery_status: "Out for Delivery",
                  sms_draft: "প্রিয় রহিম ট্রেডার্স, মেমো #MEMO-1024 (ডেলিভারি ID: DEL-1024) এর বর্তমান স্ট্যাটাস: Out for Delivery (চকবাজার, ঢাকা)। কুরিয়ার: Pathao Courier। ধন্যবাদ - হিসাব খাতা 3D"
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </main>

      {/* Modals */}
      <AIMemoModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        parties={parties}
        onAddTransaction={handleAddTransaction}
      />

      <ManualTransactionModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        parties={parties}
        onAddTransaction={handleAddTransaction}
        defaultPartyName={defaultManualPartyName}
      />

      <AddPartyModal
        isOpen={isAddPartyModalOpen}
        onClose={() => setIsAddPartyModalOpen(false)}
        onAddParty={handleAddParty}
      />

      <MemoPrintModal
        isOpen={!!printTransaction}
        onClose={() => setPrintTransaction(null)}
        transaction={printTransaction}
        party={parties.find((p) => p.name.trim().toLowerCase() === printTransaction?.party_name.trim().toLowerCase())}
      />
    </div>
  );
}

