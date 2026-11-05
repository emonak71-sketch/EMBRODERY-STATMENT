
import React, { useState, useRef } from 'react';
import { Plus, ReceiptText, Trash2, Download, Loader2, CheckCircle2, Landmark, Phone, Edit2, Check, X, ArrowLeft } from 'lucide-react';
import { Party, Transaction, User as UserType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import * as htmlToImage from 'html-to-image';

interface LedgerProps {
  setActiveTab?: (tab: string) => void;
  parties: Party[];
  selectedParty: Party | null;
  transactions: Transaction[];
  user: UserType | null;
  onAddTransaction: (data: Omit<Transaction, 'id' | 'created_at'>) => Promise<void>;
  onEditTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onSendSMS?: (phone: string, message: string) => Promise<{success: boolean, message: string}>;
}

const Ledger: React.FC<LedgerProps> = ({ 
  parties, selectedParty, transactions, user, 
  onAddTransaction, onEditTransaction, onDeleteTransaction, onSendSMS, setActiveTab
}) => {
  const { t } = useLanguage();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [billNo, setBillNo] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [entryType, setEntryType] = useState<'work' | 'payment'>('work');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);
  
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editBillNo, setEditBillNo] = useState<string>('');
  const [showQuickEntry, setShowQuickEntry] = useState(false);

  const ledgerRef = useRef<HTMLDivElement>(null);

  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty || isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      const val = Number(amount) || 0;
      await onAddTransaction({
        party_id: selectedParty.id,
        date,
        bill_no: billNo || 'N/A',
        details: entryType === 'payment' ? 'Cash Payment' : 'Embroidery Work',
        pcs: 0,
        rate: 0,
        credit: entryType === 'work' ? val : 0,
        payment: entryType === 'payment' ? val : 0,
      });
      
      setAmount('');
      setBillNo('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setEditValue(String(tx.credit || tx.payment));
    setEditBillNo(tx.bill_no);
  };

  const handleSaveEdit = async (tx: Transaction) => {
    if (!editingTxId) return;
    const val = Number(editValue) || 0;
    const updates: Partial<Transaction> = {
      bill_no: editBillNo,
      credit: tx.credit > 0 ? val : 0,
      payment: tx.payment > 0 ? val : 0
    };
    await onEditTransaction(tx.id, updates);
    setEditingTxId(null);
  };

  const handleDownloadHD = async () => {
    const node = ledgerRef.current;
    if (!node || isDownloading) return;

    setIsDownloading(true);
    const originalClassName = node.className;
    const originalStyle = node.getAttribute('style');
    try {
      window.getSelection()?.removeAllRanges();

      // Export a predictable landscape-width document even when the app is
      // opened on a narrow mobile viewport.
      const exportWidth = 960;
      node.classList.add('statement-exporting');
      node.style.width = `${exportWidth}px`;
      node.style.minWidth = `${exportWidth}px`;
      node.style.maxWidth = 'none';
      node.style.boxSizing = 'border-box';
      node.style.padding = '40px';
      node.style.margin = '0';
      node.style.transform = 'none';
      node.style.overflow = 'visible';

      if (document.fonts?.ready) await document.fonts.ready;
      await Promise.all(Array.from(node.querySelectorAll('img')).map(async image => {
        if (image.complete) return;
        await new Promise<void>(resolve => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        });
      }));
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

      const options = {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        skipFonts: true,
        style: {
          transform: 'none',
          transformOrigin: 'top left',
          width: `${exportWidth}px`,
          minWidth: `${exportWidth}px`,
          maxWidth: 'none',
          margin: '0',
          padding: '40px',
          boxSizing: 'border-box',
          overflow: 'visible',
        },
      };

      let dataUrl: string;
      let fileExtension = 'jpg';
      try {
        dataUrl = await htmlToImage.toJpeg(node, options);
      } catch (jpegError) {
        console.warn('JPEG statement export failed; trying PNG fallback.', jpegError);
        dataUrl = await htmlToImage.toPng(node, {
          ...options,
          quality: undefined,
        });
        fileExtension = 'png';
      }

      const safePartyName = (selectedParty?.name || 'Customer')
        .replace(/[\\/:*?"<>|]+/g, '-')
        .trim() || 'Customer';
      const link = document.createElement('a');
      link.download = `${safePartyName}_Statement_${date}.${fileExtension}`;
      link.href = dataUrl;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();

      setShowDownloadSuccess(true);
      window.setTimeout(() => setShowDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Statement image export failed:', err);
      alert('Could not save the statement image. Please try again, or use CSV export as a backup.');
    } finally {
      node.className = originalClassName;
      if (originalStyle === null) node.removeAttribute('style');
      else node.setAttribute('style', originalStyle);
      setIsDownloading(false);
    }
  };

  const calculateLedger = () => {
    let balance = 0;
    let tCredit = 0;
    let tPayment = 0;
    
    const sortedTxs = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const entries = sortedTxs.map(t => {
      balance = balance + (Number(t.credit) || 0) - (Number(t.payment) || 0);
      tCredit += (Number(t.credit) || 0);
      tPayment += (Number(t.payment) || 0);
      return { ...t, running_balance: balance };
    }).reverse();

    return { entries, tCredit, tPayment, finalBalance: balance };
  };

  const { entries, tCredit, tPayment, finalBalance } = calculateLedger();

  const handleSendAlert = async () => {
    if (!selectedParty || !selectedParty.phone || isSendingSMS || !onSendSMS) {
      if (selectedParty && !selectedParty.phone) {
        alert("Please add a phone number for this party to send SMS.");
      }
      return;
    }
    setIsSendingSMS(true);
    const message = `Hello ${selectedParty.name},\nYour current due balance is ৳${finalBalance.toLocaleString('en-IN')}.\nPlease clear the dues as soon as possible.\n- ${user?.business_name || 'Business'}`;
    const res = await onSendSMS(selectedParty.phone, message);
    alert(res.message);
    setIsSendingSMS(false);
  };

  const handleExportCSV = () => {
    if (!selectedParty || entries.length === 0) return;
    
    const headers = ['Date', 'Bill No', 'Details', 'Credit', 'Payment', 'Balance'];
    const csvContent = [
      headers.join(','),
      ...entries.map(entry => {
        const d = new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const details = entry.details ? `"${entry.details.replace(/"/g, '""')}"` : '';
        return `${d},"${entry.bill_no}",${details},${entry.credit},${entry.payment},${entry.running_balance}`;
      }),
      `"Statement Summary",,,,${finalBalance}`
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedParty.name}_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-w-0 w-full max-w-full flex-col xl:flex-row gap-6 pb-20">
      
            {/* Forms Area / Transaction History Wrapper */}
      <div className="w-full xl:w-[300px] space-y-4 no-print order-2 xl:order-2 xl:sticky xl:top-4 self-start">
        
{/* Transaction History */}
        {selectedParty && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Recent Transactions</h3>
             <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
               {entries.slice().reverse().map(e => (
                 <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 group border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                   <div className="flex-1 min-w-0">
                      {editingTxId === e.id ? (
                        <div className="flex gap-2">
                          <input type="text" className="w-16 bg-white dark:bg-slate-900 p-1 text-[11px] border rounded" value={editBillNo} onChange={(ev) => setEditBillNo(ev.target.value)} />
                          <input type="number" className="w-24 bg-white dark:bg-slate-900 p-1 text-[11px] border rounded font-black" value={editValue} onChange={(ev) => setEditValue(ev.target.value)} />
                        </div>
                      ) : (
                        <div className="text-sm font-bold truncate">
                          <span className="text-slate-400 text-[10px] mr-2">{new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</span>
                          <span className="text-[10px] text-slate-500 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded mr-2 font-mono">#{e.bill_no}</span>
                          <span className={`${e.credit > 0 ? 'text-primary-600' : 'text-emerald-600'} text-sm font-black`}>৳{e.credit || e.payment}</span>
                        </div>
                      )}
                   </div>
                   <div className="flex items-center gap-1">
                     {editingTxId === e.id ? (
                        <>
                          <button onClick={() => handleSaveEdit(e)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingTxId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
                        </>
                     ) : (
                        <>
                          <button onClick={() => handleStartEdit(e)} className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => onDeleteTransaction(e.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                        </>
                     )}
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>

      {/* Memo Display Area */}
      <div className="flex-1 min-w-0 w-full order-1 xl:order-1">
        {!selectedParty ? (
          <div className="h-40 bg-white dark:bg-slate-900 rounded-[2rem] flex flex-col items-center justify-center p-6 text-center border border-slate-200 dark:border-slate-800">
            <Landmark className="w-8 h-8 text-slate-200 mb-2" />
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest">Select a party from the sidebar</h2>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="ledger-toolbar flex justify-between items-center gap-2 bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-md no-print">
              <div className="flex items-center gap-3 truncate">
                {setActiveTab && (
                  <button onClick={() => setActiveTab('parties')} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="truncate">
                  <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">{selectedParty.name}</h2>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Statement View</p>
                </div>
              </div>
              <div className="ledger-actions flex gap-2">
                <button 
                  onClick={() => setShowQuickEntry(true)}
                  className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" /> Quick Entry
                </button>

                <button 
                  onClick={handleSendAlert} 
                  disabled={isSendingSMS || !selectedParty.phone}
                  className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all"
                >
                  {isSendingSMS ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
                  Alert
                </button>
                <button 
                  onClick={handleExportCSV} 
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </button>
                <button 
                  onClick={handleDownloadHD} 
                  disabled={isDownloading}
                  className="flex items-center gap-2 bg-slate-900 dark:bg-primary-600 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50 transition-all"
                >
                  {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Save Statement
                </button>
              </div>
            </div>

            <div className="ledger-preview-wrapper w-full min-w-0 no-print bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden overflow-x-auto">
              <div 
                ref={ledgerRef}
                className="statement-document bg-white text-slate-800 p-4 md:p-12 min-h-[700px] w-full min-w-0 mx-auto font-sans"
              >
                <div className="statement-document-content w-full min-w-0">
                  {/* Header */}
                  <div className="statement-header flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-6 mb-8">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
                        {user?.business_name || 'Business'}
                      </h1>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Hisab Statement Memo</p>
                    </div>
                    <div className="statement-date text-left sm:text-right">
                      <p className="text-sm font-medium text-slate-500 mb-1">{t('date')}</p>
                      <p className="text-base font-semibold text-slate-800">
                        {new Date().toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>

                  {/* Customer Info & Summary */}
                  <div className="statement-customer-summary grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-10">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Billed To</p>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">{selectedParty.name}</h3>
                      <p className="text-sm text-slate-600 font-medium">{selectedParty.phone || 'N/A'}</p>
                    </div>
                    <div className="statement-amount-due flex flex-col justify-center items-start sm:items-end text-left sm:text-right">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Amount Due</p>
                      <div className={`text-3xl font-bold tracking-tight leading-none ${finalBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ৳{finalBalance.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <table className="statement-table w-full">
                    <colgroup>
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '30%' }} />
                    </colgroup>
                    <thead>
                      <tr className="border-y border-slate-200 bg-slate-50/50">
                        <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('date')}</th>
                        <th className="py-3 px-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Bill</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('credit')}</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('payment')}</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('balance')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entries.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-16 text-center text-slate-400 font-medium text-sm">No transactions found</td>
                        </tr>
                      ) : entries.map(entry => (
                        <tr key={entry.id} className="text-sm">
                          <td className="py-4 px-4 font-medium text-slate-700">{new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                          <td className="py-4 px-4 font-medium text-slate-700 text-center">{entry.bill_no}</td>
                          <td className="py-4 px-4 text-right font-medium text-slate-700">{entry.credit > 0 ? entry.credit.toLocaleString() : '-'}</td>
                          <td className="py-4 px-4 text-right font-medium text-slate-700">{entry.payment > 0 ? entry.payment.toLocaleString() : '-'}</td>
                          <td className={`py-4 px-4 text-right font-semibold ${entry.running_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {entry.running_balance.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td colSpan={2} className="py-4 px-4 text-sm font-semibold text-slate-700">Statement Summary</td>
                        <td className="py-4 px-4 text-right font-semibold text-slate-700">{tCredit.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right font-semibold text-slate-700">{tPayment.toLocaleString()}</td>
                        <td className={`py-4 px-4 text-right text-lg font-bold ${finalBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          ৳{finalBalance.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Signatures */}
                  <div className="statement-signatures mt-24 flex justify-between gap-12 px-8">
                    <div className="flex-1 border-t border-slate-300 pt-3 text-center">
                      <p className="text-xs font-semibold text-slate-500">Customer Signature</p>
                    </div>
                    <div className="flex-1 border-t border-slate-300 pt-3 text-center">
                      <p className="text-xs font-semibold text-slate-500">Authorized Signature</p>
                    </div>
                  </div>

                  <div className="mt-16 pt-8 border-t border-slate-100 text-center">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Generated by Hisaab Khata Engine</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showDownloadSuccess && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-6">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-widest">Statement Downloaded Successfully</span>
        </div>
      )}

      {showQuickEntry && selectedParty && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm animate-in zoom-in-95 relative">
            <button onClick={() => setShowQuickEntry(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary-50 dark:bg-primary-900/30 rounded-xl text-primary-600">
                <ReceiptText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">Quick Entry</h3>
                <p className="text-xs font-bold text-slate-500">{selectedParty.name}</p>
              </div>
            </div>
            
            <form onSubmit={(e) => {
              handleTxSubmit(e);
              setShowQuickEntry(false);
            }} className="space-y-4">
              <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <button type="button" onClick={() => setEntryType('work')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${entryType === 'work' ? 'bg-white dark:bg-slate-700 shadow-md text-primary-600' : 'text-slate-500'}`}>Work</button>
                <button type="button" onClick={() => setEntryType('payment')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${entryType === 'payment' ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-600' : 'text-slate-500'}`}>{t('payment')}</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3.5 text-xs font-bold w-full outline-none focus:ring-2 focus:ring-primary-500 transition-all" />
                <input type="text" placeholder="Bill No" value={billNo} onChange={e => setBillNo(e.target.value)} className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3.5 text-xs font-bold w-full outline-none focus:ring-2 focus:ring-primary-500 transition-all" />
              </div>
              <input 
                type="number" 
                placeholder="Amount (৳)" 
                required
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                className={`w-full ${entryType === 'work' ? 'bg-primary-50 text-primary-700' : 'bg-emerald-50 text-emerald-700'} dark:bg-slate-800 border-none rounded-xl p-4 text-2xl text-center font-black outline-none focus:ring-2 focus:ring-primary-500 transition-all`} 
              />
              <button type="submit" disabled={isSubmitting} className={`w-full font-black py-4 rounded-xl shadow-lg transition-all active:scale-95 uppercase text-xs tracking-widest ${entryType === 'work' ? 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'} text-white`}>
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2 animate-pulse">
                    <Loader2 className="w-5 h-5 animate-spin" /> SAVING...
                  </span>
                ) : `Save ${entryType}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ledger;
