
import React, { useState, useRef } from 'react';
import { Plus, ReceiptText, Trash2, Download, Loader2, CheckCircle2, Landmark, Phone, Edit2, Check, X, ArrowLeft } from 'lucide-react';
import { Party, Transaction, User as UserType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface LedgerProps {
  setActiveTab?: (tab: string) => void;
  parties: Party[];
  selectedParty: Party | null;
  transactions: Transaction[];
  user: UserType | null;
  onAddTransaction: (data: Omit<Transaction, 'id' | 'created_at'>) => Promise<void>;
  onEditTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
}

const Ledger: React.FC<LedgerProps> = ({ 
  parties, selectedParty, transactions, user, 
  onAddTransaction, onEditTransaction, onDeleteTransaction, setActiveTab
}) => {
  const { t } = useLanguage();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [billNo, setBillNo] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [pcs, setPcs] = useState<string>('');
  const [rate, setRate] = useState<string>('');
  const [details, setDetails] = useState('Embroidery Work');
  const [entryType, setEntryType] = useState<'work' | 'payment'>('work');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);
  
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editBillNo, setEditBillNo] = useState<string>('');
  const [editPcs, setEditPcs] = useState<string>('');
  const [editRate, setEditRate] = useState<string>('');
  const [editDetails, setEditDetails] = useState<string>('');
  const [showQuickEntry, setShowQuickEntry] = useState(false);

  const ledgerRef = useRef<HTMLDivElement>(null);

  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty || isSubmitting) return;

    setFormError(null);
    const pcsValue = entryType === 'work' ? Number(pcs) : 0;
    const rateValue = entryType === 'work' ? Number(rate) : 0;
    const val = entryType === 'work' ? pcsValue * rateValue : Number(amount);

    if (!Number.isFinite(val) || val <= 0) {
      setFormError(entryType === 'work'
        ? 'PCS এবং Rate সঠিকভাবে লিখুন। মোট কাজের টাকা স্বয়ংক্রিয়ভাবে হিসাব হবে।'
        : 'সঠিক পেমেন্টের পরিমাণ লিখুন।');
      return;
    }
    if (entryType === 'work' && (!Number.isInteger(pcsValue) || pcsValue <= 0 || !Number.isFinite(rateValue) || rateValue <= 0)) {
      setFormError('PCS অবশ্যই পূর্ণসংখ্যা এবং Rate শূন্যের বেশি হতে হবে।');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddTransaction({
        party_id: selectedParty.id,
        date,
        bill_no: billNo.trim() || 'N/A',
        details: entryType === 'payment' ? 'Cash Payment' : (details.trim() || 'Embroidery Work'),
        pcs: entryType === 'work' ? pcsValue : 0,
        rate: entryType === 'work' ? rateValue : 0,
        credit: entryType === 'work' ? val : 0,
        payment: entryType === 'payment' ? val : 0,
      });
      setAmount('');
      setPcs('');
      setRate('');
      setDetails('Embroidery Work');
      setBillNo('');
      setFormError(null);
      setShowQuickEntry(false);
    } catch (err) {
      console.error('Transaction save failed:', err);
      setFormError(err instanceof Error ? err.message : 'লেনদেন সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setEditValue(String(tx.credit || tx.payment));
    setEditBillNo(tx.bill_no);
    setEditPcs(String(tx.pcs || ''));
    setEditRate(String(tx.rate || ''));
    setEditDetails(tx.details || '');
    setFormError(null);
  };

  const handleSaveEdit = async (tx: Transaction) => {
    if (!editingTxId || isSavingEdit) return;
    const val = Number(editValue);
    const pcsValue = tx.credit > 0 ? Number(editPcs) || 0 : 0;
    const rateValue = tx.credit > 0 ? Number(editRate) || 0 : 0;
    const productionAmount = pcsValue > 0 && rateValue > 0 ? pcsValue * rateValue : val;
    if (
      !Number.isFinite(val) || val < 0 || !Number.isFinite(productionAmount) ||
      pcsValue < 0 || rateValue < 0 ||
      (tx.credit > 0 && ((pcsValue > 0) !== (rateValue > 0))) ||
      (pcsValue > 0 && !Number.isInteger(pcsValue))
    ) {
      setFormError('সঠিক পরিমাণ, PCS এবং Rate লিখুন। PCS ও Rate একসঙ্গে দিতে হবে।');
      return;
    }

    setIsSavingEdit(true);
    setFormError(null);
    try {
      const updates: Partial<Transaction> = {
        bill_no: editBillNo.trim() || 'N/A',
        details: editDetails.trim() || (tx.payment > 0 ? 'Cash Payment' : 'Embroidery Work'),
        pcs: pcsValue,
        rate: rateValue,
        credit: tx.credit > 0 ? productionAmount : 0,
        payment: tx.payment > 0 ? val : 0
      };
      await onEditTransaction(tx.id, updates);
      setEditingTxId(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'রেকর্ড আপডেট করা যায়নি।');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDownloadHD = async () => {
    if (!ledgerRef.current || isDownloading) return;
    
    setIsDownloading(true);
    try {
      // Clear any selections
      window.getSelection()?.removeAllRanges();
      
      const node = ledgerRef.current;
      
      // Ensure the content is visible and layout is stable
      await new Promise(r => setTimeout(r, 200));

      const { toJpeg } = await import('html-to-image');
      const dataUrl = await toJpeg(node, {
        quality: 0.95,
        pixelRatio: 2, 
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          margin: '0',
          padding: '40px'
        }
      });

      const link = document.createElement('a');
      link.download = `${selectedParty?.name}_Statement_${date}.jpg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setShowDownloadSuccess(true);
      setTimeout(() => setShowDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Download error:', err);
      alert('Download error. Please ensure you are not in a private/incognito window if on mobile.');
    } finally {
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

  const handleWhatsAppAlert = () => {
    if (!selectedParty?.phone) {
      setFormError('WhatsApp বার্তা পাঠাতে আগে এই কাস্টমারের ফোন নম্বর যোগ করুন।');
      return;
    }
    const digits = selectedParty.phone.replace(/\D/g, '');
    const phone = digits.startsWith('0') ? `88${digits}` : digits;
    if (phone.length < 8) {
      setFormError('কাস্টমারের ফোন নম্বরটি সঠিক নয়।');
      return;
    }
    const message = `Hello ${selectedParty.name}, your current due balance is ৳${finalBalance.toLocaleString('en-IN')}. Please review your account statement. - ${user?.business_name || 'Business'}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleExportCSV = () => {
    if (!selectedParty || entries.length === 0) return;

    const csvCell = (value: string | number | null | undefined, protectFormula = false) => {
      let text = String(value ?? '');
      if (protectFormula && /^[=+@-]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const headers = ['Date', 'Bill No', 'Details', 'PCS', 'Rate', 'Work Credit', 'Payment', 'Balance'];
    const rows = entries.map(entry => {
      const d = new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
      return [
        csvCell(d), csvCell(entry.bill_no, true), csvCell(entry.details, true),
        csvCell(entry.pcs || 0), csvCell(entry.rate || 0),
        csvCell(entry.credit || 0), csvCell(entry.payment || 0),
        csvCell(entry.running_balance || 0)
      ].join(',');
    });
    const csvContent = String.fromCharCode(0xFEFF) + [headers.map(header => csvCell(header)).join(','), ...rows].join(String.fromCharCode(13, 10));
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedParty.name.replace(/[^a-z0-9-_]/gi, '_') + '_Ledger_' + new Date().toISOString().split('T')[0] + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
                        <div className="grid w-full grid-cols-2 gap-2">
                          <input aria-label="Edit bill number" type="text" className="min-w-0 w-full bg-white dark:bg-slate-900 p-2 text-[11px] border rounded-lg" value={editBillNo} onChange={(ev) => setEditBillNo(ev.target.value)} />
                          <input aria-label="Edit amount" type="number" min="0" step="0.01" className="min-w-0 w-full bg-white dark:bg-slate-900 p-2 text-[11px] border rounded-lg font-black disabled:opacity-70" value={e.credit > 0 && Number(editPcs) > 0 && Number(editRate) > 0 ? String(Number(editPcs) * Number(editRate)) : editValue} disabled={e.credit > 0 && Number(editPcs) > 0 && Number(editRate) > 0} onChange={(ev) => setEditValue(ev.target.value)} />
                          {e.credit > 0 && (
                            <>
                              <input aria-label="Edit production PCS" type="number" min="0" step="1" className="min-w-0 w-full bg-white dark:bg-slate-900 p-2 text-[11px] border rounded-lg" placeholder="PCS" value={editPcs} onChange={(ev) => setEditPcs(ev.target.value)} />
                              <input aria-label="Edit production rate" type="number" min="0" step="0.01" className="min-w-0 w-full bg-white dark:bg-slate-900 p-2 text-[11px] border rounded-lg" placeholder="Rate" value={editRate} onChange={(ev) => setEditRate(ev.target.value)} />
                            </>
                          )}
                          <input aria-label="Edit transaction details" type="text" className="col-span-2 min-w-0 w-full bg-white dark:bg-slate-900 p-2 text-[11px] border rounded-lg" placeholder="Details" value={editDetails} onChange={(ev) => setEditDetails(ev.target.value)} />
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">
                            <span className="text-slate-400 text-[10px] mr-2">{new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</span>
                            <span className="text-[10px] text-slate-500 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded mr-2 font-mono">#{e.bill_no}</span>
                            <span className={`${e.credit > 0 ? 'text-primary-600' : 'text-emerald-600'} text-sm font-black`}>৳{e.credit || e.payment}</span>
                          </div>
                          {e.credit > 0 && (
                            <p className="mt-1 truncate text-[10px] font-medium text-slate-500">
                              {e.details || 'Embroidery Work'}{e.pcs > 0 && e.rate > 0 ? ` · ${e.pcs} pcs × ৳${e.rate}` : ''}
                            </p>
                          )}
                        </div>
                      )}
                   </div>
                   <div className="flex items-center gap-1">
                     {editingTxId === e.id ? (
                        <>
                          <button type="button" aria-label="Save transaction changes" disabled={isSavingEdit} onClick={() => void handleSaveEdit(e)} className="transaction-action-button text-emerald-500 hover:bg-emerald-50 rounded-lg disabled:opacity-50"><Check className="w-4 h-4" /></button>
                          <button type="button" aria-label="Cancel transaction edit" onClick={() => setEditingTxId(null)} className="transaction-action-button text-slate-400 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
                        </>
                     ) : (
                        <>
                          <button type="button" aria-label={`Edit transaction ${e.bill_no}`} onClick={() => handleStartEdit(e)} className="transaction-action-button text-slate-400 hover:text-primary-500 hover:bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button type="button" aria-label={`Delete transaction ${e.bill_no}`} onClick={() => onDeleteTransaction(e.id)} className="transaction-action-button text-slate-400 hover:text-rose-500 hover:bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
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
                  <button type="button" aria-label="Back to customers" onClick={() => setActiveTab('parties')} className="min-h-11 min-w-11 grid place-items-center p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300">
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
                  onClick={() => { setFormError(null); setShowQuickEntry(true); }}
                  className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" /> Quick Entry
                </button>

                <button 
                  onClick={handleWhatsAppAlert}
                  disabled={!selectedParty.phone}
                  className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
                <button 
                  onClick={handleExportCSV}
                  disabled={entries.length === 0}
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
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '34%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '18%' }} />
                    </colgroup>
                    <thead>
                      <tr className="border-y border-slate-200 bg-slate-50/50">
                        <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('date')}</th>
                        <th className="py-3 px-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Bill</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Work / Production</th>
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
                          <td className="py-4 px-4 text-right font-medium text-slate-700">
                            {entry.credit > 0 ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="font-bold">৳{entry.credit.toLocaleString('en-IN')}</span>
                                <span className="max-w-full text-[10px] text-slate-500">{entry.details || 'Embroidery Work'}</span>
                                {entry.pcs > 0 && entry.rate > 0 && <span className="text-[10px] text-slate-400">{entry.pcs} pcs × ৳{entry.rate.toLocaleString('en-IN')}</span>}
                              </div>
                            ) : '-'}
                          </td>
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
          <span className="text-[10px] font-black uppercase tracking-widest">Statement Saved to Gallery</span>
        </div>
      )}

      {showQuickEntry && selectedParty && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm animate-in zoom-in-95 relative">
            <button type="button" aria-label="Close quick entry" onClick={() => { setShowQuickEntry(false); setFormError(null); }} className="absolute top-4 right-4 min-h-11 min-w-11 grid place-items-center p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
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
            
            <form onSubmit={handleTxSubmit} className="space-y-4">
              <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <button type="button" aria-pressed={entryType === 'work'} onClick={() => { setEntryType('work'); setFormError(null); }} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${entryType === 'work' ? 'bg-white dark:bg-slate-700 shadow-md text-primary-600' : 'text-slate-500'}`}>Work / Production</button>
                <button type="button" aria-pressed={entryType === 'payment'} onClick={() => { setEntryType('payment'); setFormError(null); }} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${entryType === 'payment' ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-600' : 'text-slate-500'}`}>{t('payment')}</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block min-w-0">
                  <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Date</span>
                  <input aria-label="Transaction date" type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full min-w-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all" />
                </label>
                <label className="block min-w-0">
                  <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Memo / Bill No.</span>
                  <input aria-label="Memo or bill number" type="text" placeholder="Bill No" value={billNo} onChange={e => setBillNo(e.target.value)} className="w-full min-w-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all" />
                </label>
              </div>
              {entryType === 'work' ? (
                <>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Design / Work Details</span>
                    <input aria-label="Design or work details" type="text" value={details} onChange={e => setDetails(e.target.value)} maxLength={120} placeholder="Embroidery design / work name" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-500 transition-all" />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Production (PCS)</span>
                      <input aria-label="Production pieces" type="number" inputMode="numeric" min="1" step="1" required value={pcs} onChange={e => setPcs(e.target.value)} placeholder="e.g. 250" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-lg font-black outline-none focus:ring-2 focus:ring-primary-500 transition-all" />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Rate / PCS (৳)</span>
                      <input aria-label="Rate per piece" type="number" inputMode="decimal" min="0.01" step="0.01" required value={rate} onChange={e => setRate(e.target.value)} placeholder="e.g. 4.50" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-lg font-black outline-none focus:ring-2 focus:ring-primary-500 transition-all" />
                    </label>
                  </div>
                  <div className="production-total-panel">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Calculated work amount</span>
                    <strong>৳{(Number(pcs) > 0 && Number(rate) > 0 ? Number(pcs) * Number(rate) : 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
                    <span className="text-[10px] text-slate-400">PCS × Rate per piece</span>
                  </div>
                </>
              ) : (
                <label className="block space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Payment received (৳)</span>
                  <input aria-label="Payment amount" type="number" inputMode="decimal" min="0.01" step="0.01" required placeholder="Amount (৳)" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-emerald-50 text-emerald-700 dark:bg-slate-800 border border-emerald-100 dark:border-slate-700 rounded-xl p-4 text-2xl text-center font-black outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                </label>
              )}
              {formError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">{formError}</p>}
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
