import React, { useRef, useState } from 'react';
import { Download, FileText, Printer, X } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Party, Transaction } from '../types';

interface TransactionInvoiceProps {
  transaction: Transaction;
  party: Party;
  businessName: string;
  runningBalance: number;
  onClose: () => void;
}

const money = (value: number) => new Intl.NumberFormat('en-BD', {
  style: 'currency',
  currency: 'BDT',
  maximumFractionDigits: 2,
}).format(Number(value) || 0);

const dateLabel = (value?: string) => value
  ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value))
  : '—';

const TransactionInvoice: React.FC<TransactionInvoiceProps> = ({
  transaction, party, businessName, runningBalance, onClose,
}) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<'save' | 'print' | null>(null);
  const [error, setError] = useState('');

  const invoiceNumber = `ES-TX-${transaction.id.replace(/-/g, '').toUpperCase()}`;
  const credit = Number(transaction.credit) || 0;
  const payment = Number(transaction.payment) || 0;
  const previousBalance = runningBalance - credit + payment;
  const isPaymentReceipt = payment > 0 && credit <= 0;
  const title = isPaymentReceipt ? 'PAYMENT RECEIPT' : credit > 0 ? 'WORK INVOICE' : 'TRANSACTION INVOICE';

  const makeImage = async () => {
    if (!invoiceRef.current) throw new Error('Invoice preview is not ready.');
    return toPng(invoiceRef.current, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: '#ffffff',
    });
  };

  const saveImage = async () => {
    if (busy) return;
    setBusy('save');
    setError('');
    try {
      const image = await makeImage();
      const link = document.createElement('a');
      link.href = image;
      link.download = `${invoiceNumber}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e: any) {
      setError(e?.message || 'Invoice image could not be generated.');
    } finally {
      setBusy(null);
    }
  };

  const printInvoice = async () => {
    if (busy) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Allow pop-ups in your browser to print this invoice.');
      return;
    }
    setBusy('print');
    setError('');
    try {
      const image = await makeImage();
      printWindow.document.open();
      printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${invoiceNumber}</title><style>html,body{margin:0;padding:0;background:#fff}body{padding:18px;display:flex;justify-content:center}img{width:100%;max-width:820px;height:auto}@page{margin:10mm}@media print{body{padding:0}img{max-width:100%;max-height:98vh;object-fit:contain}}</style></head><body><img id="invoice-image" src="${image}" alt="Transaction invoice"></body></html>`);
      printWindow.document.close();
      const imageElement = printWindow.document.getElementById('invoice-image') as HTMLImageElement | null;
      const runPrint = () => {
        printWindow.focus();
        printWindow.print();
      };
      if (imageElement?.complete) runPrint();
      else imageElement?.addEventListener('load', runPrint, { once: true });
      if (imageElement) imageElement.addEventListener('error', () => printWindow.close(), { once: true });
    } catch (e: any) {
      printWindow.close();
      setError(e?.message || 'Invoice could not be prepared for printing.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-sm">
      <div className="my-4 w-full max-w-4xl rounded-2xl bg-white p-4 shadow-2xl dark:bg-slate-900 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Transaction Invoice</h2>
            <p className="mt-1 text-xs text-slate-500">{invoiceNumber}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void saveImage()} disabled={busy!==null} className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-3 py-2.5 text-xs font-black text-white disabled:opacity-50">
              <Download size={14}/>{busy==='save'?'Saving…':'Save Image'}
            </button>
            <button type="button" onClick={() => void printInvoice()} disabled={busy!==null} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-black text-slate-700 dark:border-slate-700 dark:text-slate-200 disabled:opacity-50">
              <Printer size={14}/>{busy==='print'?'Preparing…':'Print'}
            </button>
            <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 p-2.5 text-slate-600 dark:bg-slate-800 dark:text-slate-200" aria-label="Close invoice">
              <X size={16}/>
            </button>
          </div>
        </div>
        {error&&<div role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
        <div className="max-h-[75vh] overflow-auto rounded-xl bg-slate-100 p-3 dark:bg-slate-950">
          <div ref={invoiceRef} className="mx-auto min-h-[680px] w-[760px] max-w-full bg-white p-8 text-slate-900 sm:p-10">
            <div className="flex items-start justify-between gap-5 border-b-2 border-slate-900 pb-6">
              <div>
                <div className="text-2xl font-black tracking-tight">{businessName || 'Embroidery Business'}</div>
                <div className="mt-2 text-xs font-bold uppercase tracking-[.22em] text-slate-500">Customer Transaction Document</div>
              </div>
              <div className="text-right">
                <FileText size={34} className="ml-auto text-slate-700"/>
                <div className="mt-2 text-sm font-black tracking-widest">{title}</div>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-6 text-sm">
              <div>
                <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Billed To</div>
                <div className="text-lg font-black">{party.name}</div>
                <div className="mt-1 text-slate-600">{party.phone || 'Phone not provided'}</div>
              </div>
              <div className="text-right">
                <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Document Details</div>
                <div><span className="text-slate-500">Invoice No: </span><b>{invoiceNumber}</b></div>
                <div className="mt-1"><span className="text-slate-500">Date: </span><b>{dateLabel(transaction.date)}</b></div>
                <div className="mt-1"><span className="text-slate-500">Bill No: </span><b>{transaction.bill_no || '—'}</b></div>
              </div>
            </div>

            <div className="mt-8 overflow-hidden border border-slate-200">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="bg-slate-100 text-left text-[10px] font-black uppercase tracking-wider text-slate-600">
                  <th className="p-3">Description</th><th className="p-3 text-right">Quantity</th><th className="p-3 text-right">Rate</th><th className="p-3 text-right">Amount</th>
                </tr></thead>
                <tbody>
                  {credit>0&&<tr className="border-t border-slate-200"><td className="p-3 font-semibold">{transaction.details || 'Embroidery Work'}</td><td className="p-3 text-right">{transaction.pcs || '—'}</td><td className="p-3 text-right">{transaction.rate ? money(Number(transaction.rate)) : '—'}</td><td className="p-3 text-right font-bold">{money(credit)}</td></tr>}
                  {payment>0&&<tr className="border-t border-slate-200"><td className="p-3 font-semibold">Payment Received</td><td className="p-3 text-right">—</td><td className="p-3 text-right">—</td><td className="p-3 text-right font-bold">{money(payment)}</td></tr>}
                  {credit<=0&&payment<=0&&<tr className="border-t border-slate-200"><td colSpan={4} className="p-4 text-center text-slate-500">{transaction.details || 'Transaction record'}</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="ml-auto mt-6 max-w-sm space-y-3 text-sm">
              {credit>0&&<div className="flex justify-between"><span className="text-slate-500">Work / Credit</span><b>{money(credit)}</b></div>}
              {payment>0&&<div className="flex justify-between"><span className="text-slate-500">Payment Received</span><b>{money(payment)}</b></div>}
              <div className="flex justify-between border-t border-slate-200 pt-3"><span className="text-slate-500">Previous Balance</span><b>{money(previousBalance)}</b></div>
              <div className="flex justify-between border-t-2 border-slate-900 pt-3 text-lg font-black"><span>Balance After Transaction</span><span>{money(runningBalance)}</span></div>
            </div>

            <div className="mt-20 grid grid-cols-2 gap-12 text-center text-xs text-slate-500">
              <div className="border-t border-slate-300 pt-3">Customer Signature</div>
              <div className="border-t border-slate-300 pt-3">Authorized Signature</div>
            </div>
            <div className="mt-12 border-t border-slate-100 pt-5 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">Generated by Embroidery Statement</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionInvoice;
