
import React, { useState, useRef } from 'react';
import { Plus, ReceiptText, Trash2, Download, Loader2, CheckCircle2, Landmark, Phone, Edit2, Check, X } from 'lucide-react';
import { Party, Transaction, User as UserType } from '../types';
import * as htmlToImage from 'html-to-image';

interface LedgerProps {
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
  onAddTransaction, onEditTransaction, onDeleteTransaction 
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [billNo, setBillNo] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [entryType, setEntryType] = useState<'work' | 'payment'>('work');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);
  
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editBillNo, setEditBillNo] = useState<string>('');

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
    if (!ledgerRef.current || isDownloading) return;
    
    setIsDownloading(true);
    try {
      // Clear any selections
      window.getSelection()?.removeAllRanges();
      
      const node = ledgerRef.current;
      
      // Ensure the content is visible and layout is stable
      await new Promise(r => setTimeout(r, 200));

      const dataUrl = await htmlToImage.toJpeg(node, {
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
    });

    return { entries, tCredit, tPayment, finalBalance: balance };
  };

  const { entries, tCredit, tPayment, finalBalance } = calculateLedger();

  return (
    <div className="flex flex-col xl:flex-row gap-6 pb-20">
      
      {/* Forms Area */}
      <div className="w-full xl:w-[320px] space-y-4 no-print order-2 xl:order-1">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <ReceiptText className="w-4 h-4 text-primary-600" />
            <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-900 dark:text-white">Quick Entry</h3>
          </div>
          
          {!selectedParty ? (
            <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Select party from sidebar</p>
            </div>
          ) : (
            <form onSubmit={handleTxSubmit} className="space-y-3">
              <div className="flex gap-1.5 p-1 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <button type="button" onClick={() => setEntryType('work')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${entryType === 'work' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600' : 'text-slate-50'}`}>Work</button>
                <button type="button" onClick={() => setEntryType('payment')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${entryType === 'payment' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600' : 'text-slate-500'}`}>Payment</button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2.5 text-[11px] font-bold w-full outline-none focus:ring-1 ring-primary-500" />
                <input type="text" placeholder="Bill No" value={billNo} onChange={e => setBillNo(e.target.value)} className="bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2.5 text-[11px] font-bold w-full outline-none focus:ring-1 ring-primary-500" />
              </div>

              <input 
                type="number" 
                placeholder="Amount (৳)" 
                required
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                className={`w-full ${entryType === 'work' ? 'bg-primary-50/50 text-primary-700' : 'bg-emerald-50/50 text-emerald-700'} dark:bg-slate-800 border-none rounded-lg p-3 text-lg font-black outline-none focus:ring-1`} 
              />

              <button type="submit" disabled={isSubmitting} className={`w-full font-black py-4 rounded-xl shadow-lg transition-all active:scale-95 uppercase text-[10px] tracking-widest ${entryType === 'work' ? 'bg-primary-600' : 'bg-emerald-600'} text-white`}>
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" /> SAVING...
                  </span>
                ) : `Save ${entryType}`}
              </button>
            </form>
          )}
        </div>

        {/* Transaction History */}
        {selectedParty && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
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
      <div className="flex-1 order-1 xl:order-2">
        {!selectedParty ? (
          <div className="h-40 bg-white dark:bg-slate-900 rounded-[2rem] flex flex-col items-center justify-center p-6 text-center border border-slate-200 dark:border-slate-800">
            <Landmark className="w-8 h-8 text-slate-200 mb-2" />
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest">Select a party from the sidebar</h2>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center gap-2 bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-md no-print">
              <div className="truncate">
                <h2 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">{selectedParty.name}</h2>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Statement View</p>
              </div>
              <button 
                onClick={handleDownloadHD} 
                disabled={isDownloading}
                className="flex items-center gap-2 bg-slate-900 dark:bg-primary-600 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50 transition-all"
              >
                {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Save Statement
              </button>
            </div>

            <div className="w-full no-print bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden overflow-x-auto">
              <div 
                ref={ledgerRef}
                className="bg-white text-slate-950 p-6 md:p-12 min-h-[700px] w-full max-w-[800px] mx-auto"
              >
                <div className="min-w-[400px]">
                  <div className="flex justify-between items-start border-b-[4px] border-slate-950 pb-5 mb-8">
                    <div>
                      <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-tight">{user?.business_name || 'Business'}</h1>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1">Hisab Statement Memo</p>
                    </div>
                    <div className="text-right">
                      <div className="bg-slate-950 text-white px-3 py-1.5 rounded text-[11px] font-black uppercase tracking-widest">
                        {new Date().toLocaleDateString('en-GB')}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mb-10">
                    <div className="bg-slate-50 p-5 rounded-2xl border-l-[8px] border-slate-950">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Customer Details</p>
                      <h3 className="text-lg md:text-xl font-black uppercase leading-tight mb-1">{selectedParty.name}</h3>
                      <p className="text-[10px] text-slate-600 font-mono font-black">{selectedParty.phone || 'N/A'}</p>
                    </div>
                    <div className="flex flex-col justify-center items-end text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Due Balance</p>
                      <div className={`text-4xl font-black tracking-tighter leading-none ${finalBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ৳{finalBalance.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  <table className="w-full border-collapse border-slate-950">
                    <thead>
                      <tr className="border-y-[3px] border-slate-950 text-slate-950 text-[12px]">
                        <th className="py-3 px-2 text-left font-black uppercase border-r-[2px] border-slate-950 w-24">Date</th>
                        <th className="py-3 px-2 text-center font-black uppercase border-r-[2px] border-slate-950 w-20">Bill</th>
                        <th className="py-3 px-2 text-right font-black uppercase border-r-[2px] border-slate-950">Credit</th>
                        <th className="py-3 px-2 text-right font-black uppercase border-r-[2px] border-slate-950">Payment</th>
                        <th className="py-3 px-2 text-right font-black uppercase">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-[1px] divide-slate-200">
                      {entries.length === 0 ? (
                        <tr><td colSpan={5} className="py-24 text-center text-slate-300 font-black uppercase text-xs tracking-widest border border-slate-100">No transactions found</td></tr>
                      ) : entries.map(entry => (
                        <tr key={entry.id} className="text-slate-950 text-[12px]">
                          <td className="py-4 px-2 font-bold border-r-[2px] border-slate-950">{new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                          <td className="py-4 px-2 font-black text-center border-r-[2px] border-slate-950">{entry.bill_no}</td>
                          <td className="py-4 px-2 text-right font-black border-r-[2px] border-slate-950">{entry.credit > 0 ? entry.credit.toLocaleString() : '-'}</td>
                          <td className="py-4 px-2 text-right font-black border-r-[2px] border-slate-950">{entry.payment > 0 ? entry.payment.toLocaleString() : '-'}</td>
                          <td className={`py-4 px-2 text-right font-black ${entry.running_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {entry.running_balance.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-[3px] border-slate-950 font-black text-slate-950 text-[12px] bg-slate-50">
                        <td colSpan={2} className="py-6 px-3 uppercase font-black border-r-[2px] border-slate-950">Statement Summary</td>
                        <td className="py-6 px-3 text-right border-r-[2px] border-slate-950">{tCredit.toLocaleString()}</td>
                        <td className="py-6 px-3 text-right border-r-[2px] border-slate-950">{tPayment.toLocaleString()}</td>
                        <td className={`py-6 px-3 text-right text-2xl font-black ${finalBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          ৳{finalBalance.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  <div className="mt-24 flex justify-between gap-12">
                    <div className="flex-1 border-t-[2px] border-slate-950 pt-3 text-center">
                      <p className="text-[11px] font-black uppercase tracking-widest">Customer Signature</p>
                    </div>
                    <div className="flex-1 border-t-[2px] border-slate-950 pt-3 text-center">
                      <p className="text-[11px] font-black uppercase tracking-widest">Authorized Signature</p>
                    </div>
                  </div>

                  <div className="mt-16 pt-8 border-t border-slate-100 text-center">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">DIGITAL HISAB STATEMENT • SECURE & VERIFIED</p>
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
    </div>
  );
};

export default Ledger;
