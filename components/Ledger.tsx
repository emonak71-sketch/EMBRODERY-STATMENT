import React, { useMemo, useRef, useState } from 'react';
import { Plus, ReceiptText, Trash2, Download, Loader2, CheckCircle2, Landmark, Phone, Edit2, Check, X, ArrowLeft, MessageCircle, Search, Calculator } from 'lucide-react';
import { Party, Transaction, User as UserType, TabType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface LedgerProps {
  setActiveTab?: (tab: TabType) => void;
  parties: Party[];
  selectedParty: Party | null;
  transactions: Transaction[];
  user: UserType | null;
  onAddTransaction: (data: Omit<Transaction, 'id' | 'created_at'>) => Promise<void>;
  onEditTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onSendAlert?: (phone: string, message: string) => Promise<{ success: boolean; message: string }>;
}

const localDateValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const money = (value: number) => `৳${Number(value || 0).toLocaleString('en-IN')}`;

const Ledger: React.FC<LedgerProps> = ({
  parties, selectedParty, transactions, user,
  onAddTransaction, onEditTransaction, onDeleteTransaction, onSendAlert, setActiveTab
}) => {
  const { t } = useLanguage();
  const [date, setDate] = useState(localDateValue);
  const [billNo, setBillNo] = useState('');
  const [amount, setAmount] = useState('');
  const [pcs, setPcs] = useState('');
  const [rate, setRate] = useState('');
  const [details, setDetails] = useState('');
  const [entryType, setEntryType] = useState<'work' | 'payment'>('work');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editBillNo, setEditBillNo] = useState('');
  const [editPcs, setEditPcs] = useState('');
  const [editRate, setEditRate] = useState('');
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const ledgerRef = useRef<HTMLDivElement>(null);

  const ledger = useMemo(() => {
    let balance = 0;
    let totalCredit = 0;
    let totalPayment = 0;
    const sorted = [...transactions].sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });
    const chronological = sorted.map(transaction => {
      const credit = Number(transaction.credit) || 0;
      const payment = Number(transaction.payment) || 0;
      balance += credit - payment;
      totalCredit += credit;
      totalPayment += payment;
      return { ...transaction, running_balance: balance };
    });
    return {
      entries: chronological.slice().reverse(),
      totalCredit,
      totalPayment,
      finalBalance: balance
    };
  }, [transactions]);

  const handleTxSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedParty || isSubmitting) return false;

    const pcsValue = entryType === 'work' ? Number(pcs) || 0 : 0;
    const rateValue = entryType === 'work' ? Number(rate) || 0 : 0;
    if (entryType === 'work' && ((pcsValue > 0 && rateValue <= 0) || (rateValue > 0 && pcsValue <= 0))) {
      alert('PCS এবং Rate দুটোই দিন।');
      return false;
    }
    const value = entryType === 'work' && pcsValue > 0 && rateValue > 0 ? pcsValue * rateValue : Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      alert('সঠিক Amount লিখুন।');
      return false;
    }

    setIsSubmitting(true);
    try {
      await onAddTransaction({
        party_id: selectedParty.id,
        date,
        bill_no: billNo.trim() || 'N/A',
        details: entryType === 'payment' ? 'Cash Payment' : details.trim() || 'Embroidery Work',
        pcs: pcsValue,
        rate: rateValue,
        credit: entryType === 'work' ? value : 0,
        payment: entryType === 'payment' ? value : 0
      });
      setAmount('');
      setPcs('');
      setRate('');
      setDetails('');
      setBillNo('');
      setDate(localDateValue());
      return true;
    } catch (error) {
      console.error('Could not save ledger entry:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (transaction: Transaction) => {
    setEditingTxId(transaction.id);
    setEditValue(String(transaction.credit || transaction.payment || ''));
    setEditBillNo(transaction.bill_no || '');
    setEditPcs(String(transaction.pcs || ''));
    setEditRate(String(transaction.rate || ''));
  };

  const handleSaveEdit = async (transaction: Transaction) => {
    if (!editingTxId) return;
    const pcsValue = transaction.credit > 0 ? Number(editPcs) || 0 : 0;
    const rateValue = transaction.credit > 0 ? Number(editRate) || 0 : 0;
    if (transaction.credit > 0 && ((pcsValue > 0 && rateValue <= 0) || (rateValue > 0 && pcsValue <= 0))) {
      alert('PCS এবং Rate দুটোই দিন।');
      return;
    }
    const value = transaction.credit > 0 && pcsValue > 0 && rateValue > 0
      ? pcsValue * rateValue
      : Number(editValue);
    if (!Number.isFinite(value) || value <= 0) {
      alert('সঠিক Amount লিখুন।');
      return;
    }
    try {
      await onEditTransaction(transaction.id, {
        bill_no: editBillNo.trim() || 'N/A',
        pcs: pcsValue,
        rate: rateValue,
        credit: transaction.credit > 0 ? value : 0,
        payment: transaction.payment > 0 ? value : 0
      });
      setEditingTxId(null);
    } catch (error) {
      console.error('Could not update ledger entry:', error);
    }
  };

  const handleDownloadHD = async () => {
    if (!ledgerRef.current || !selectedParty || isDownloading) return;
    setIsDownloading(true);
    try {
      window.getSelection()?.removeAllRanges();
      const { toJpeg } = await import('html-to-image');
      const dataUrl = await toJpeg(ledgerRef.current, {
        quality: 0.96,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true
      });
      const link = document.createElement('a');
      link.download = `${selectedParty.name}_Statement_${date}.jpg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setShowDownloadSuccess(true);
      window.setTimeout(() => setShowDownloadSuccess(false), 3000);
    } catch (error) {
      console.error('Statement export failed:', error);
      alert('Statement তৈরি করা যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendAlert = async () => {
    if (!selectedParty || !selectedParty.phone || !onSendAlert || isSendingAlert) {
      if (selectedParty && !selectedParty.phone) alert('প্রথমে কাস্টমারের ফোন নম্বর যোগ করুন।');
      return;
    }
    setIsSendingAlert(true);
    try {
      const message = `Hello ${selectedParty.name},\nYour current due balance is ৳${ledger.finalBalance.toLocaleString('en-IN')}.\nPlease contact us for your latest embroidery statement.\n- ${user?.business_name || 'Embroidery Statement'}`;
      const result = await onSendAlert(selectedParty.phone, message);
      if (!result.success) alert(result.message);
      else alert(result.message);
    } catch (error) {
      console.error('WhatsApp reminder failed:', error);
      alert('WhatsApp reminder খোলা যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setIsSendingAlert(false);
    }
  };

  const handleExportCSV = () => {
    if (!selectedParty || ledger.entries.length === 0) {
      alert('Export করার মতো কোনো লেনদেন নেই।');
      return;
    }
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const headers = ['Date', 'Bill No', 'Design / Details', 'PCS', 'Rate', 'Credit', 'Payment', 'Balance'];
    const rows = ledger.entries.map(entry => [
      new Date(entry.date).toLocaleDateString('en-GB'),
      entry.bill_no,
      entry.details || '',
      Number(entry.pcs || 0),
      Number(entry.rate || 0),
      Number(entry.credit || 0),
      Number(entry.payment || 0),
      Number(entry.running_balance || 0)
    ].map(escapeCsv).join(','));
    rows.push(['Statement Summary', '', '', '', '', ledger.totalCredit, ledger.totalPayment, ledger.finalBalance].map(escapeCsv).join(','));
    const blob = new Blob(['\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedParty.name}_Ledger_${localDateValue()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="flex min-w-0 w-full max-w-full flex-col xl:flex-row gap-6 pb-20">
      <aside className="w-full xl:w-[320px] space-y-4 no-print order-2 xl:order-2 xl:sticky xl:top-4 self-start">
        {selectedParty && (
          <section className="glass-panel p-4">
            <div className="mb-3 flex items-center justify-between gap-2"><div><p className="eyebrow">ACCOUNT ACTIVITY</p><h3 className="panel-title">Recent Transactions</h3></div><span className="count-pill">{ledger.entries.length}</span></div>
            <div className="max-h-[430px] overflow-y-auto space-y-2 pr-1">
              {ledger.entries.slice().reverse().map(transaction => (
                <article key={transaction.id} className="transaction-row">
                  {editingTxId === transaction.id ? (
                    <div className="w-full space-y-2">
                      <input aria-label="Bill number" type="text" value={editBillNo} onChange={event => setEditBillNo(event.target.value)} className="compact-input" />
                      {transaction.credit > 0 && <div className="grid grid-cols-2 gap-2"><input aria-label="PCS" type="number" min="0" value={editPcs} onChange={event => setEditPcs(event.target.value)} className="compact-input" placeholder="PCS" /><input aria-label="Rate" type="number" min="0" value={editRate} onChange={event => setEditRate(event.target.value)} className="compact-input" placeholder="Rate" /></div>}
                      <input aria-label="Amount" type="number" min="0" value={editValue} onChange={event => setEditValue(event.target.value)} className="compact-input" placeholder="Amount" />
                      <div className="flex justify-end gap-2"><button type="button" onClick={() => handleSaveEdit(transaction)} className="icon-action text-emerald-600" aria-label="Save edit"><Check className="h-4 w-4" /></button><button type="button" onClick={() => setEditingTxId(null)} className="icon-action" aria-label="Cancel edit"><X className="h-4 w-4" /></button></div>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{money(Number(transaction.credit || transaction.payment))}</strong><span className="record-muted">#{transaction.bill_no}</span></div>
                        <p className="mt-1 truncate text-sm">{transaction.details || (transaction.credit > 0 ? 'Embroidery Work' : 'Cash Payment')}</p>
                        <p className="record-muted mt-1">{new Date(transaction.date).toLocaleDateString('en-GB')} {transaction.credit > 0 && `· ${Number(transaction.pcs || 0)} PCS × ${money(Number(transaction.rate || 0))}`}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => handleStartEdit(transaction)} className="icon-action" aria-label="Edit transaction"><Edit2 className="h-4 w-4" /></button><button type="button" onClick={() => onDeleteTransaction(transaction.id)} className="icon-action text-rose-500" aria-label="Delete transaction"><Trash2 className="h-4 w-4" /></button></div>
                    </>
                  )}
                </article>
              ))}
              {ledger.entries.length === 0 && <div className="empty-state py-8"><ReceiptText className="h-8 w-8" /><strong>এখনো কোনো লেনদেন নেই</strong></div>}
            </div>
          </section>
        )}
      </aside>

      <section className="flex-1 min-w-0 w-full order-1 xl:order-1">
        {!selectedParty ? (
          <div className="glass-panel empty-state min-h-48"><Landmark className="h-10 w-10" /><strong>একটি কাস্টমার নির্বাচন করুন</strong><span>Sidebar বা Customer Directory থেকে কাস্টমার বেছে নিন।</span></div>
        ) : (
          <div className="space-y-4">
            <div className="ledger-toolbar glass-panel p-4 no-print">
              <div className="flex min-w-0 items-center gap-3">
                {setActiveTab && <button type="button" onClick={() => setActiveTab('parties')} className="secondary-icon-action" aria-label="Back to customers"><ArrowLeft className="h-5 w-5" /></button>}
                <div className="min-w-0"><p className="eyebrow">CUSTOMER LEDGER</p><h2 className="truncate text-lg font-black text-slate-900 dark:text-white">{selectedParty.name}</h2><p className="record-muted">{selectedParty.phone || 'ফোন নম্বর নেই'}</p></div>
              </div>
              <div className="ledger-actions">
                <button type="button" onClick={() => setShowQuickEntry(true)} className="primary-action"><Plus className="h-4 w-4" /> Quick Entry</button>
                <button type="button" onClick={handleSendAlert} disabled={isSendingAlert || !selectedParty.phone} className="secondary-action"><MessageCircle className="h-4 w-4" /> {isSendingAlert ? 'Opening…' : 'WhatsApp Alert'}</button>
                <button type="button" onClick={handleExportCSV} className="secondary-action"><Download className="h-4 w-4" /> CSV</button>
                <button type="button" onClick={handleDownloadHD} disabled={isDownloading} className="secondary-action"><Download className="h-4 w-4" /> {isDownloading ? 'Preparing…' : 'Save Statement'}</button>
              </div>
            </div>

            <div className="ledger-summary-grid no-print">
              <div className="ledger-summary-card"><span>Total Work</span><strong>{money(ledger.totalCredit)}</strong></div>
              <div className="ledger-summary-card"><span>Total Payment</span><strong>{money(ledger.totalPayment)}</strong></div>
              <div className="ledger-summary-card"><span>Current Due</span><strong className={ledger.finalBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>{money(ledger.finalBalance)}</strong></div>
            </div>

            <div className="ledger-preview-wrapper w-full min-w-0 no-print">
              <div ref={ledgerRef} className="statement-document">
                <div className="statement-document-content">
                  <header className="statement-header">
                    <div><h1>{user?.business_name || 'Embroidery Statement'}</h1><p>Customer Account Statement</p></div>
                    <div className="statement-date"><span>STATEMENT DATE</span><strong>{new Date().toLocaleDateString('en-GB')}</strong></div>
                  </header>

                  <section className="statement-customer-summary">
                    <div><span>BILLED TO</span><h2>{selectedParty.name}</h2><p>{selectedParty.phone || 'N/A'}</p></div>
                    <div className="statement-amount-due"><span>AMOUNT DUE</span><strong className={ledger.finalBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>{money(ledger.finalBalance)}</strong></div>
                  </section>

                  <div className="statement-desktop-table">
                    <table className="statement-table">
                      <thead><tr><th>Date</th><th>Bill</th><th>Work / Design</th><th className="text-right">PCS</th><th className="text-right">Rate</th><th className="text-right">Credit</th><th className="text-right">Payment</th><th className="text-right">Balance</th></tr></thead>
                      <tbody>{ledger.entries.length === 0 ? <tr><td colSpan={8} className="py-14 text-center text-slate-400">No transactions found</td></tr> : ledger.entries.map(entry => <tr key={entry.id}><td>{new Date(entry.date).toLocaleDateString('en-GB')}</td><td>{entry.bill_no}</td><td>{entry.details || (entry.credit > 0 ? 'Embroidery Work' : 'Cash Payment')}</td><td className="text-right">{entry.credit > 0 ? Number(entry.pcs || 0).toLocaleString('en-IN') : '—'}</td><td className="text-right">{entry.credit > 0 && Number(entry.rate || 0) > 0 ? money(Number(entry.rate)) : '—'}</td><td className="text-right">{entry.credit > 0 ? money(Number(entry.credit)) : '—'}</td><td className="text-right">{entry.payment > 0 ? money(Number(entry.payment)) : '—'}</td><td className={`text-right font-bold ${Number(entry.running_balance) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{money(Number(entry.running_balance))}</td></tr>)}</tbody>
                      <tfoot><tr><td colSpan={5}>Statement Summary</td><td className="text-right">{money(ledger.totalCredit)}</td><td className="text-right">{money(ledger.totalPayment)}</td><td className="text-right">{money(ledger.finalBalance)}</td></tr></tfoot>
                    </table>
                  </div>

                  <div className="statement-mobile-list">
                    {ledger.entries.length === 0 ? <div className="py-10 text-center text-slate-400">No transactions found</div> : ledger.entries.map(entry => (
                      <article key={entry.id} className="statement-mobile-card">
                        <div className="flex items-start justify-between gap-3"><div><strong>{entry.bill_no}</strong><span>{new Date(entry.date).toLocaleDateString('en-GB')}</span></div><b className={Number(entry.running_balance) > 0 ? 'text-rose-600' : 'text-emerald-600'}>{money(Number(entry.running_balance))}</b></div>
                        <p>{entry.details || (entry.credit > 0 ? 'Embroidery Work' : 'Cash Payment')}</p>
                        {entry.credit > 0 && <div className="statement-mobile-meta"><span>{Number(entry.pcs || 0).toLocaleString('en-IN')} PCS</span><span>Rate {money(Number(entry.rate || 0))}</span><strong>Work {money(Number(entry.credit))}</strong></div>}
                        {entry.payment > 0 && <div className="statement-mobile-meta"><strong className="text-emerald-600">Payment {money(Number(entry.payment))}</strong></div>}
                      </article>
                    ))}
                  </div>

                  <footer className="statement-footer">
                    <div><span>Customer Signature</span></div><div><span>Authorized Signature</span></div>
                  </footer>
                  <p className="statement-generated">Generated by Embroidery Statement</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {showDownloadSuccess && <div role="status" className="download-toast"><CheckCircle2 className="h-5 w-5 text-emerald-500" /><span>Statement image downloaded</span></div>}

      {showQuickEntry && selectedParty && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 modal-backdrop">
          <section className="glass-modal relative w-full max-w-lg p-6 sm:p-8">
            <button type="button" onClick={() => setShowQuickEntry(false)} className="absolute right-4 top-4 secondary-icon-action" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="mb-6 flex items-center gap-3"><div className="page-heading-icon"><ReceiptText className="h-6 w-6" /></div><div><p className="eyebrow">NEW LEDGER ENTRY</p><h3 className="text-xl font-black text-slate-900 dark:text-white">Quick Entry</h3><p className="record-muted">{selectedParty.name}</p></div></div>
            <form onSubmit={async event => { const saved = await handleTxSubmit(event); if (saved) setShowQuickEntry(false); }} className="space-y-4">
              <div className="entry-type-switch"><button type="button" onClick={() => { setEntryType('work'); setAmount(''); }} className={entryType === 'work' ? 'active' : ''}>Work / Production</button><button type="button" onClick={() => { setEntryType('payment'); setAmount(''); setPcs(''); setRate(''); setDetails(''); }} className={entryType === 'payment' ? 'active' : ''}>Payment Received</button></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="form-field"><span>Date</span><input type="date" required value={date} onChange={event => setDate(event.target.value)} /></label><label className="form-field"><span>Bill / Memo No.</span><input type="text" value={billNo} onChange={event => setBillNo(event.target.value)} placeholder="e.g. B-1045" /></label></div>
              {entryType === 'work' && (
                <>
                  <label className="form-field"><span>Design / Work Details</span><input type="text" value={details} onChange={event => setDetails(event.target.value)} placeholder="Design name or work description" /></label>
                  <div className="grid grid-cols-2 gap-3"><label className="form-field"><span>Quantity (PCS)</span><input type="number" min="0" step="1" value={pcs} onChange={event => { setPcs(event.target.value); if (Number(event.target.value) > 0 && Number(rate) > 0) setAmount(String(Number(event.target.value) * Number(rate))); else setAmount(''); }} placeholder="0" /></label><label className="form-field"><span>Rate per PCS (৳)</span><input type="number" min="0" step="0.01" value={rate} onChange={event => { setRate(event.target.value); if (Number(pcs) > 0 && Number(event.target.value) > 0) setAmount(String(Number(pcs) * Number(event.target.value))); else setAmount(''); }} placeholder="0.00" /></label></div>
                  <div className="calculation-hint"><Calculator className="h-4 w-4" /><span>{Number(pcs) > 0 && Number(rate) > 0 ? `${Number(pcs).toLocaleString('en-IN')} PCS × ${money(Number(rate))} = ${money(calculatedAmount)}` : 'PCS ও Rate দিলে Amount স্বয়ংক্রিয়ভাবে হিসাব হবে।'}</span></div>
                </>
              )}
              <label className="form-field"><span>{entryType === 'work' ? 'Work Amount (৳)' : 'Payment Amount (৳)'}</span><input type="number" min="0.01" step="0.01" required readOnly={hasProductionCalculation} value={hasProductionCalculation ? String(calculatedAmount) : amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" className="amount-input" /></label>
              <button type="submit" disabled={isSubmitting} className="primary-action w-full justify-center py-4 disabled:opacity-50">{isSubmitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Saving…</> : <><Check className="h-5 w-5" /> Save {entryType === 'work' ? 'Work Entry' : 'Payment'}</>}</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default Ledger;
