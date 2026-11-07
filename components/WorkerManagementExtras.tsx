import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toJpeg, toPng } from 'html-to-image';
import {
  BadgeCheck, BriefcaseBusiness, CalendarDays, Camera, CheckCircle2, CreditCard,
  Download, FileImage, FileText, History, IdCard, Loader2, MessageSquare,
  Printer, RefreshCw, Search, ShieldCheck, TrendingUp, Upload, Wallet, X
} from 'lucide-react';
import { addCalendarYear, daysBetween } from '../desktop/accountingCore';
import { dbService } from '../services/supabaseService';
import { useLanguage } from '../contexts/LanguageContext';

type Worker = {
  id: string; worker_code: string; full_name: string; phone: string;
  designation: string; joining_date: string; monthly_salary: number; is_active: boolean;
  active_salary_month?: string; salary_review_base_date?: string;
};
type WorkerDocument = {
  id: string; worker_id: string; document_type: string; file_path: string;
  file_name: string; mime_type: string; file_size: number; uploaded_at: string;
};
type Increment = {
  id: string; worker_id: string; previous_salary: number; increment_amount: number;
  increment_percentage: number; new_salary: number; effective_date: string;
  reason: string; notes?: string; approved_by?: string; created_at: string;
};
type Advance = {
  id: string; worker_id: string; amount: number; outstanding_amount: number;
  request_date: string; disbursed_at: string; deduct_from_month: string;
  reason: string; status: 'outstanding' | 'recovered'; recovered_at?: string;
};
type Payroll = {
  id: string; worker_id: string; month_key: string; basic_salary: number;
  overtime_hours: number; overtime_amount: number; attendance_bonus?: number; bonus: number; deduction: number;
  advance_deduction?: number; net_salary: number; status: 'draft' | 'paid';
  paid_at?: string | null; payment_method?: string | null; payment_reference?: string | null;
};
type SmsLog = {
  id: string; worker_id: string; event_type: 'salary_paid' | 'advance_paid' | 'custom'; related_id?: string | null; idempotency_key: string;
  mobile: string; message: string; sms_mode: 'non-masking' | 'masking';
  sender_id?: string | null; status: 'pending' | 'accepted' | 'failed';
  error_message?: string | null; attempts: number; created_at: string; accepted_at?: string | null;
};
type SmsDraft = {
  worker: Worker; message: string;
  eventType: 'salary_paid' | 'advance_paid' | 'custom';
  relatedId?: string;
  idempotencyKey?: string;
};
type ExtraTab = 'documents' | 'idcard' | 'increments' | 'advances' | 'annual' | 'payslip' | 'sms';
type DocumentType = 'profile_photo' | 'nid_front' | 'nid_back' | 'birth_certificate' | 'driving_license' | 'passport' | 'other';

const today = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
};
const money = (n: number) => new Intl.NumberFormat('en-BD', {
  style: 'currency', currency: 'BDT', maximumFractionDigits: 2
}).format(Number(n) || 0);
const dateLabel = (value?: string | null) => value
  ? new Date(value.length === 10 ? value + 'T00:00:00' : value).toLocaleDateString('en-GB')
  : '—';
const monthInDhaka = (value?: string | null) => {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit'
  }).formatToParts(new Date(value));
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  return year + '-' + month;
};
const downloadDataUrl = (dataUrl: string, fileName: string) => {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
};
const downloadPdfFromJpeg = (jpegDataUrl: string, imageWidth: number, imageHeight: number, fileName: string) => {
  const base64 = jpegDataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const imageBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) imageBytes[i] = binary.charCodeAt(i);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const scale = Math.min((pageWidth - 48) / imageWidth, (pageHeight - 48) / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const drawX = (pageWidth - drawWidth) / 2;
  const drawY = (pageHeight - drawHeight) / 2;
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  const push = (part: Uint8Array) => { chunks.push(part); byteLength += part.length; };
  const text = (value: string) => push(encoder.encode(value));
  const offsets: number[] = [];

  text('%PDF-1.4\n');
  offsets[1] = byteLength;
  text('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  offsets[2] = byteLength;
  text('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  offsets[3] = byteLength;
  text('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n');
  offsets[4] = byteLength;
  text('4 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + Math.max(1, Math.round(imageWidth)) +
    ' /Height ' + Math.max(1, Math.round(imageHeight)) +
    ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + imageBytes.length + ' >>\nstream\n');
  push(imageBytes);
  text('\nendstream\nendobj\n');
  const contentStream = 'q\n' + drawWidth.toFixed(2) + ' 0 0 ' + drawHeight.toFixed(2) + ' ' +
    drawX.toFixed(2) + ' ' + drawY.toFixed(2) + ' cm\n/Im0 Do\nQ\n';
  const contentBytes = encoder.encode(contentStream);
  offsets[5] = byteLength;
  text('5 0 obj\n<< /Length ' + contentBytes.length + ' >>\nstream\n');
  push(contentBytes);
  text('endstream\nendobj\n');
  const xrefOffset = byteLength;
  text('xref\n0 6\n0000000000 65535 f \n');
  for (let i = 1; i <= 5; i++) text(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
  text('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF');

  const pdfBytes = new Uint8Array(byteLength);
  let cursor = 0;
  chunks.forEach(part => { pdfBytes.set(part, cursor); cursor += part.length; });
  const url = URL.createObjectURL(new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
};
const printElementAsImage = async (element: HTMLElement, title: string) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) throw new Error('Allow pop-ups to print this document.');
  const image = await toPng(element, { pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' });
  printWindow.document.open();
  printWindow.document.write(
    '<!doctype html><html><head><title>' + title.replace(/[<>]/g, '') +
    '</title><style>body{margin:0;padding:20px;display:flex;justify-content:center;align-items:flex-start;background:#fff}img{max-width:100%;height:auto;object-fit:contain}@media print{body{padding:0}img{max-width:100%;max-height:98vh}}</style></head><body><img src="' +
    image + '" /></body></html>'
  );
  printWindow.document.close();
  printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
};

const documentTypes: { id: DocumentType; labelBn: string; labelEn: string; accept: string }[] = [
  { id: 'profile_photo', labelBn: 'কর্মীর ছবি', labelEn: 'Worker Photo', accept: 'image/jpeg,image/png,image/webp' },
  { id: 'nid_front', labelBn: 'NID কার্ড (সামনে)', labelEn: 'NID Front', accept: 'image/*,application/pdf' },
  { id: 'nid_back', labelBn: 'NID কার্ড (পেছনে)', labelEn: 'NID Back', accept: 'image/*,application/pdf' },
  { id: 'birth_certificate', labelBn: 'জন্ম নিবন্ধন', labelEn: 'Birth Certificate', accept: 'image/*,application/pdf' },
  { id: 'driving_license', labelBn: 'ড্রাইভিং লাইসেন্স', labelEn: 'Driving Licence', accept: 'image/*,application/pdf' },
  { id: 'passport', labelBn: 'পাসপোর্ট', labelEn: 'Passport', accept: 'image/*,application/pdf' },
  { id: 'other', labelBn: 'অন্যান্য ডকুমেন্ট', labelEn: 'Other Document', accept: 'image/*,application/pdf' }
];

interface Props {
  userId: string;
  companyName: string;
  onWorkersChanged?: () => Promise<void> | void;
  initialTab?: ExtraTab;
}

const WorkerManagementExtras: React.FC<Props> = ({ userId, companyName, onWorkersChanged, initialTab = 'documents' }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const tr = (bn: string, en: string) => isBn ? bn : en;

  const [tab, setTab] = useState<ExtraTab>(initialTab);
  useEffect(() => { setTab(initialTab); }, [initialTab]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [documents, setDocuments] = useState<WorkerDocument[]>([]);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [uploadingType, setUploadingType] = useState<DocumentType | ''>('');
  const idCardRef = useRef<HTMLDivElement>(null);
  const slipRef = useRef<HTMLDivElement>(null);

  const [increments, setIncrements] = useState<Increment[]>([]);
  const [incrementValue, setIncrementValue] = useState('');
  const incrementSaving = useRef(false);
  useEffect(() => { setIncrementValue(''); setIncrementDate(today()); setIncrementNotes(''); setIncrementReason('annual_appraisal'); setNotice(''); }, [selectedWorkerId]);
  const [incrementDate, setIncrementDate] = useState(today());
  const [incrementReason, setIncrementReason] = useState('annual_appraisal');
  const [incrementNotes, setIncrementNotes] = useState('');

  const [advances, setAdvances] = useState<Advance[]>([]);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceDate, setAdvanceDate] = useState(today());
  const [deductMonth, setDeductMonth] = useState(today().slice(0, 7));
  const [advanceReason, setAdvanceReason] = useState('');

  const [year, setYear] = useState(new Date().getFullYear());
  const [annualPayrolls, setAnnualPayrolls] = useState<Payroll[]>([]);
  const [annualAdvances, setAnnualAdvances] = useState<Advance[]>([]);
  const [annualLoading, setAnnualLoading] = useState(false);

  const [slipMonth, setSlipMonth] = useState(today().slice(0, 7));
  const [slipWorkerId, setSlipWorkerId] = useState('');
  const [monthPayroll, setMonthPayroll] = useState<Payroll[]>([]);
  const [smsDraft, setSmsDraft] = useState<SmsDraft | null>(null);
  const [smsSending, setSmsSending] = useState(false);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [smsLogsLoading, setSmsLogsLoading] = useState(false);

  const selectedWorker = useMemo(
    () => workers.find(w => w.id === selectedWorkerId) || null,
    [workers, selectedWorkerId]
  );
  const activeWorkers = useMemo(() => workers.filter(w => w.is_active !== false), [workers]);
  const profilePhoto = useMemo(() => {
    const doc = documents.find(d => d.document_type === 'profile_photo');
    return doc ? documentUrls[doc.id] || '' : '';
  }, [documents, documentUrls]);

  const loadWorkers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await dbService.getWorkers() as Worker[];
      setWorkers(rows);
      setSelectedWorkerId(current => rows.some(w => w.id === current) ? current : (rows[0]?.id || ''));
      setSlipWorkerId(current => rows.some(w => w.id === current) ? current : (rows[0]?.id || ''));
    } catch (e: any) {
      setError(e.message || 'Could not load workers.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    if (!selectedWorkerId) { setDocuments([]); setDocumentUrls({}); return; }
    try {
      const rows = await dbService.getWorkerDocuments(selectedWorkerId) as WorkerDocument[];
      setDocuments(rows);
      const latestById: Record<string, string> = {};
      await Promise.all(rows.map(async doc => {
        try { latestById[doc.id] = await dbService.getWorkerDocumentSignedUrl(doc.file_path); }
        catch { latestById[doc.id] = ''; }
      }));
      setDocumentUrls(latestById);
    } catch (e: any) {
      setError(e.message || 'Could not load worker documents. Run the worker SQL setup first.');
    }
  }, [selectedWorkerId]);

  const loadIncrements = useCallback(async () => {
    try { setIncrements(await dbService.getWorkerSalaryIncrements() as Increment[]); }
    catch (e: any) { setError(e.message || 'Could not load salary increment history.'); }
  }, []);

  const loadAdvances = useCallback(async () => {
    try { setAdvances(await dbService.getWorkerAdvances() as Advance[]); }
    catch (e: any) { setError(e.message || 'Could not load worker advances.'); }
  }, []);

  const loadAnnual = useCallback(async () => {
    setAnnualLoading(true);
    try {
      const [payrollRows, advanceRows] = await Promise.all([
        dbService.getWorkerPayrollForYear(year),
        dbService.getWorkerAdvancesForYear(year)
      ]);
      setAnnualPayrolls(payrollRows as Payroll[]);
      setAnnualAdvances(advanceRows as Advance[]);
    } catch (e: any) {
      setError(e.message || 'Could not load annual expense report. Run the worker SQL setup first.');
    } finally {
      setAnnualLoading(false);
    }
  }, [year]);

  const loadMonthPayroll = useCallback(async () => {
    try { setMonthPayroll(await dbService.getWorkerPayroll(slipMonth) as Payroll[]); }
    catch (e: any) { setError(e.message || 'Could not load monthly payslips.'); }
  }, [slipMonth]);

  useEffect(() => { loadWorkers(); }, [loadWorkers]);
  useEffect(() => { loadDocuments(); }, [loadDocuments]);
  useEffect(() => { loadIncrements(); }, [loadIncrements]);
  useEffect(() => { loadAdvances(); }, [loadAdvances]);
  useEffect(() => { loadAnnual(); }, [loadAnnual]);
  const loadSmsLogs = useCallback(async () => {
    setSmsLogsLoading(true);
    try {
      setSmsLogs(await dbService.getWorkerSmsLogs() as SmsLog[]);
    } catch (e: any) {
      setError(e.message || 'Could not load SMS history. Apply the worker SMS SQL setup first.');
    } finally {
      setSmsLogsLoading(false);
    }
  }, []);

  useEffect(() => { loadMonthPayroll(); }, [loadMonthPayroll]);
  useEffect(() => { if (tab === 'sms') loadSmsLogs(); }, [tab, loadSmsLogs]);

  const refreshAll = async () => {
    await Promise.all([loadWorkers(), loadDocuments(), loadIncrements(), loadAdvances(), loadAnnual(), loadMonthPayroll()]);
    setNotice(tr('তথ্য রিফ্রেশ হয়েছে।', 'Data refreshed.'));
  };

  const uploadDocument = async (type: DocumentType, file?: File) => {
    if (!selectedWorker || !file) return;
    setUploadingType(type);
    setError('');
    setNotice('');
    try {
      await dbService.uploadWorkerDocument(selectedWorker.id, type, file);
      await loadDocuments();
      setNotice(tr('ডকুমেন্ট নিরাপদে আপলোড হয়েছে।', 'Document uploaded securely.'));
    } catch (e: any) {
      setError(e.message || 'Document upload failed.');
    } finally {
      setUploadingType('');
    }
  };

  const exportElement = async (element: HTMLElement | null, name: string, kind: 'png' | 'pdf' | 'print') => {
    if (!element) return;
    setError('');
    try {
      if (kind === 'print') {
        await printElementAsImage(element, name);
        return;
      }
      if (kind === 'png') {
        const image = await toPng(element, { pixelRatio: 3, cacheBust: true, backgroundColor: '#ffffff' });
        downloadDataUrl(image, name + '.png');
        return;
      }
      const jpeg = await toJpeg(element, { quality: 0.96, pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' });
      downloadPdfFromJpeg(jpeg, element.offsetWidth * 2, element.offsetHeight * 2, name + '.pdf');
    } catch (e: any) {
      setError(e.message || tr('ফাইল তৈরি করা যায়নি।', 'Could not generate the file.'));
    }
  };

  const submitIncrement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedWorker || incrementSaving.current) return;
    const currentSalary = Number(selectedWorker.monthly_salary) || 0;
    const newSalary = Math.round(Number(incrementValue) * 100) / 100;
    const roundedAmount = (Math.round(newSalary * 100) - Math.round(currentSalary * 100)) / 100;
    if (!Number.isFinite(newSalary) || roundedAmount <= 0) { setError(tr('বেতন বৃদ্ধির পরিমাণ সঠিক নয়।', 'Enter a valid increment amount.')); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(incrementDate) || incrementDate > today()) { setError(tr('আজ বা আগের কার্যকর হওয়ার তারিখ দিন।', 'Choose today or an earlier effective date.')); return; }
    incrementSaving.current = true;
    setSaving(true); setError(''); setNotice('');
    try {
      await dbService.addWorkerSalaryIncrement({
        worker_id: selectedWorker.id,
        previous_salary: currentSalary,
        increment_amount: roundedAmount,
        increment_percentage: currentSalary > 0 ? Math.round((roundedAmount / currentSalary) * 10000) / 100 : 0,
        new_salary: Math.round((currentSalary + roundedAmount) * 100) / 100,
        effective_date: incrementDate,
        reason: incrementReason,
        notes: incrementNotes,
        approved_by: 'Admin'
      });
      setIncrementValue('');
      await Promise.all([loadWorkers(), loadIncrements(), onWorkersChanged?.()]);
      setNotice(tr('বেতন বৃদ্ধি সংরক্ষিত হয়েছে এবং বর্তমান বেতন আপডেট হয়েছে।', 'Increment saved and worker salary updated.'));
      setIncrementNotes('');
    } catch (e: any) {
      setError(e.message || 'Increment could not be saved. Refresh the worker salary and try again.');
    } finally { incrementSaving.current = false; setSaving(false); }
  };

  useEffect(() => {
    if (!selectedWorker) return;
    // Advances stay on this worker's active salary cycle until that month's
    // payroll is actually marked Paid. Calendar date alone never changes it.
    setDeductMonth(selectedWorker.active_salary_month || today().slice(0, 7));
  }, [selectedWorkerId, selectedWorker?.active_salary_month]);

  const submitAdvance = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedWorker) return;
    const amount = Number(advanceAmount);
    if (!Number.isFinite(amount) || amount <= 0) { setError(tr('সঠিক অগ্রিম টাকার পরিমাণ দিন।', 'Enter a valid advance amount.')); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      const advanceRow = await dbService.addWorkerAdvance({
        worker_id: selectedWorker.id,
        amount,
        request_date: advanceDate,
        deduct_from_month: deductMonth,
        reason: advanceReason.trim()
      });
      await loadAdvances();
      window.dispatchEvent(new CustomEvent('embroidery:remote-data-changed'));
      const advanceMessage = tr(
        selectedWorker.full_name + ', ' + companyName + ' থেকে আপনাকে ' + money(amount) + ' টাকা অগ্রিম দেওয়া হয়েছে। এটি ' + deductMonth + ' মাসের বেতন থেকে সমন্বয় হবে।',
        'Dear ' + selectedWorker.full_name + ', ' + money(amount) + ' advance has been issued by ' + companyName + '. It will be adjusted from your ' + deductMonth + ' salary.'
      );
      setAdvanceAmount('');
      setAdvanceReason('');
      setSmsDraft({ worker: selectedWorker, message: advanceMessage, eventType: 'advance_paid', relatedId: advanceRow.id });
      setNotice(tr('অগ্রিম সংরক্ষিত হয়েছে। SMS পাঠাতে চাইলে বার্তাটি যাচাই করে Send চাপুন।', 'Advance saved. Review the editable SMS draft and press Send only if you want to notify the worker.'));
    } catch (e: any) {
      setError(e.message || 'Advance could not be recorded. Check the salary month; it may already be paid.');
    } finally { setSaving(false); }
  };

  const incrementRows = useMemo(() => increments
    .map(row => ({ ...row, worker: workers.find(w => w.id === row.worker_id) }))
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date)), [increments, workers]);

  const annualRows = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const monthKey = year + '-' + String(index + 1).padStart(2, '0');
    const payrollRows = annualPayrolls.filter(p => monthInDhaka(p.paid_at) === monthKey);
    const advanceRows = annualAdvances.filter(a => String(a.request_date || '').slice(0, 7) === monthKey);
    const gross = payrollRows.reduce((sum, p) => sum + Number(p.basic_salary || 0) + Number(p.overtime_amount || 0) + Number(p.attendance_bonus || 0) + Number(p.bonus || 0), 0);
    const netPaid = payrollRows.reduce((sum, p) => sum + Number(p.net_salary || 0), 0);
    const advancesGiven = advanceRows.reduce((sum, a) => sum + Number(a.amount || 0), 0);
    const advanceRecovered = payrollRows.reduce((sum, p) => sum + Number(p.advance_deduction || 0), 0);
    return { monthKey, gross, netPaid, advancesGiven, advanceRecovered, cashOutflow: netPaid + advancesGiven };
  }), [year, annualPayrolls, annualAdvances]);

  const annualTotals = useMemo(() => annualRows.reduce((acc, row) => ({
    gross: acc.gross + row.gross,
    netPaid: acc.netPaid + row.netPaid,
    advancesGiven: acc.advancesGiven + row.advancesGiven,
    advanceRecovered: acc.advanceRecovered + row.advanceRecovered,
    cashOutflow: acc.cashOutflow + row.cashOutflow
  }), { gross: 0, netPaid: 0, advancesGiven: 0, advanceRecovered: 0, cashOutflow: 0 }), [annualRows]);

  const exportAnnualCsv = () => {
    const rows = [
      ['Month', 'Gross Salary Expense', 'Net Salary Paid', 'Advances Disbursed', 'Advance Recovered (info only)', 'Cash Outflow'],
      ...annualRows.map(r => [r.monthKey, r.gross, r.netPaid, r.advancesGiven, r.advanceRecovered, r.cashOutflow]),
      ['TOTAL', annualTotals.gross, annualTotals.netPaid, annualTotals.advancesGiven, annualTotals.advanceRecovered, annualTotals.cashOutflow]
    ];
    const csv = rows.map(row => row.map(value => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'worker-annual-expense-' + year + '.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const selectedSlip = useMemo(
    () => monthPayroll.find(p => p.worker_id === slipWorkerId) || null,
    [monthPayroll, slipWorkerId]
  );
  const slipWorker = useMemo(
    () => workers.find(w => w.id === slipWorkerId) || null,
    [workers, slipWorkerId]
  );
  const requestSlipSms = () => {
    if (!selectedSlip || !slipWorker || selectedSlip.status !== 'paid') return;
    setSmsDraft({
      worker: slipWorker,
      eventType: 'custom',
      idempotencyKey: crypto.randomUUID(),
      message: tr(
        slipWorker.full_name + ', ' + slipMonth + ' মাসের বেতন ' + money(selectedSlip.net_salary) + ' টাকা পরিশোধ করা হয়েছে। ধন্যবাদ। - ' + companyName,
        'Dear ' + slipWorker.full_name + ', your ' + slipMonth + ' salary of ' + money(selectedSlip.net_salary) + ' has been paid. Thank you. - ' + companyName
      )
    });
  };

  const sendSmsDraft = async () => {
    if (!smsDraft) return;
    if (!smsDraft.worker.phone) { setError(tr('এই কর্মীর মোবাইল নম্বর নেই।', 'This worker has no mobile number.')); return; }
    setSmsSending(true);
    setError('');
    setNotice('');
    try {
      const result = await dbService.sendWorkerSms({
        worker_id: smsDraft.worker.id,
        event_type: smsDraft.eventType,
        related_id: smsDraft.relatedId,
        idempotency_key: smsDraft.eventType === 'custom' ? (smsDraft.idempotencyKey || crypto.randomUUID()) : undefined,
        message: smsDraft.message
      });
      setNotice(result.duplicate
        ? tr('এই SMS আগে থেকেই DNotify গ্রহণ করেছে; আবার পাঠানো হয়নি।', 'DNotify already accepted this SMS; it was not sent again.')
        : tr('DNotify SMS পাঠানোর অনুরোধ গ্রহণ করেছে।', 'DNotify accepted the SMS request.'));
      setSmsDraft(null);
      await loadSmsLogs();
    } catch (e: any) {
      setError(e.message || 'DNotify SMS could not be sent. Check SMS History and retry.');
      await loadSmsLogs();
    } finally {
      setSmsSending(false);
    }
  };

  const dueInfo = (worker: Worker) => {
    const latest = increments.filter(i => i.worker_id === worker.id)
      .sort((a, b) => b.effective_date.localeCompare(a.effective_date))[0];
    const baseDate = [latest?.effective_date, worker.salary_review_base_date].filter(Boolean).sort().at(-1) || worker.joining_date;
    const dueDate = addCalendarYear(baseDate);
    const due = new Date(dueDate + 'T00:00:00');
    const reminder = new Date(dueDate + 'T00:00:00Z');
    reminder.setUTCDate(reminder.getUTCDate() - 15);
    return { baseDate, reminderDate: reminder.toISOString().slice(0,10), days: daysBetween(today(), dueDate), dueDate, eligible: new Date(today() + 'T00:00:00') >= due, latest };
  };

  const noWorkers = !loading && workers.length === 0;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[.22em] text-sky-600">HR & Workforce Tools</div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{tr('কর্মী ব্যবস্থাপনার অতিরিক্ত সুবিধা', 'Worker Management Tools')}</h2>
          <p className="mt-1 text-sm text-slate-500">{tr('ডকুমেন্ট, পরিচয়পত্র, বেতন বৃদ্ধি, অগ্রিম ও বার্ষিক হিসাব', 'Documents, ID cards, increments, advances and annual expenses')}</p>
        </div>
        <button onClick={refreshAll} disabled={loading || saving} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <RefreshCw size={14} className="mr-2 inline" />{tr('রিফ্রেশ', 'Refresh')}
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/80 p-2 dark:border-slate-800 dark:bg-slate-900/70">
        {([
          ['documents', tr('ডকুমেন্ট', 'Documents'), FileText],
          ['idcard', tr('কোম্পানি ID কার্ড', 'Company ID Card'), IdCard],
          ['increments', tr('বেতন বৃদ্ধি', 'Salary Increments'), TrendingUp],
          ['advances', tr('অগ্রিম বেতন', 'Salary Advances'), Wallet],
          ['annual', tr('বার্ষিক রিপোর্ট', 'Annual Report'), CalendarDays],
          ['payslip', tr('পে-স্লিপ', 'Payslips'), FileImage],
          ['sms', tr('SMS হিস্ট্রি', 'SMS History'), MessageSquare]
        ] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={'flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition ' + (tab === id ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {loading && <div className="rounded-2xl bg-white p-5 text-sm text-slate-500 dark:bg-slate-900"><Loader2 className="mr-2 inline animate-spin" size={16} />{tr('কর্মীর তথ্য লোড হচ্ছে...', 'Loading workers...')}</div>}
      {noWorkers && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">{tr('আগে Worker Directory থেকে কর্মী যোগ করুন। তারপর এখানে ডকুমেন্ট, ID Card ও Salary Management ব্যবহার করতে পারবেন।', 'Add a worker in Worker Directory first. Then you can manage documents, ID cards and salary records here.')}</div>}

      {!noWorkers && workers.length > 0 && (
        <>
          {tab !== 'annual' && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">{tr('কর্মী নির্বাচন', 'Select worker')}</label>
              <select aria-label={tr('কর্মী নির্বাচন', 'Select worker')} disabled={saving} value={selectedWorkerId} onChange={e => { setSelectedWorkerId(e.target.value); setSlipWorkerId(e.target.value); }} className="min-w-[220px] flex-1 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
                {workers.map(w => <option key={w.id} value={w.id}>{w.worker_code} — {w.full_name}</option>)}
              </select>
              <span className="text-xs text-slate-400">{selectedWorker?.designation || ''}</span>
            </div>
          )}

          {tab === 'documents' && selectedWorker && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-3"><ShieldCheck className="text-emerald-600" /><div><h3 className="font-black">{tr('কর্মীর পরিচয় ও ডকুমেন্ট', 'Worker Identity Documents')}</h3><p className="text-xs text-slate-500">{tr('Private Storage: শুধু আপনার Account থেকে দেখা যাবে। পুরোনো ফাইল প্রতিস্থাপন না করে নতুন Version রাখা হয়।', 'Private storage: visible only to your account. New uploads are kept as new versions.')}</p></div></div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {documentTypes.map(docType => {
                  const latest = documents.find(d => d.document_type === docType.id);
                  const url = latest ? documentUrls[latest.id] : '';
                  return (
                    <div key={docType.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                      <div className="mb-2 flex items-center justify-between gap-2"><span className="text-sm font-bold">{tr(docType.labelBn, docType.labelEn)}</span>{latest && <BadgeCheck size={16} className="text-emerald-600" />}</div>
                      {latest ? <div className="mb-2 text-xs text-slate-500">{latest.file_name}<br />{dateLabel(latest.uploaded_at)}</div> : <p className="mb-2 text-xs text-slate-400">{tr('এখনো আপলোড করা হয়নি', 'Not uploaded yet')}</p>}
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="cursor-pointer rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          <Upload size={13} className="mr-1 inline" />{uploadingType === docType.id ? tr('আপলোড হচ্ছে...', 'Uploading...') : tr('আপলোড', 'Upload')}
                          <input type="file" accept={docType.accept} className="hidden" disabled={!!uploadingType} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) uploadDocument(docType.id, file); }} />
                        </label>
                        {url && <a href={url} target="_blank" rel="noreferrer" className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{tr('দেখুন', 'View')}</a>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-slate-500">{tr('সমর্থিত ফাইল: JPG, PNG, WEBP, PDF · সর্বোচ্চ ১০ MB।', 'Supported files: JPG, PNG, WEBP, PDF · Maximum 10 MB.')}</p>
            </section>
          )}

          {tab === 'idcard' && selectedWorker && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black">{tr('কোম্পানির কর্মী পরিচয়পত্র', 'Official Employee ID Card')}</h3><p className="text-xs text-slate-500">{tr('কর্মী আপনার প্রতিষ্ঠানে কাজ করেন—এটি প্রমাণের জন্য ব্যবহারযোগ্য।', 'An employer-issued card confirming the worker is employed by your company.')}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => exportElement(idCardRef.current, 'Employee-ID-' + selectedWorker.worker_code, 'print')} className="rounded-lg border px-3 py-2 text-xs font-bold dark:border-slate-700"><Printer size={13} className="mr-1 inline" />{tr('প্রিন্ট', 'Print')}</button><button onClick={() => exportElement(idCardRef.current, 'Employee-ID-' + selectedWorker.worker_code, 'pdf')} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white"><Download size={13} className="mr-1 inline" />PDF</button><button onClick={() => exportElement(idCardRef.current, 'Employee-ID-' + selectedWorker.worker_code, 'png')} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold dark:bg-slate-800">PNG</button></div></div>
              <div className="overflow-x-auto rounded-xl bg-slate-100 p-4 dark:bg-slate-950">
                <div ref={idCardRef} className="relative mx-auto flex min-h-[260px] w-[460px] max-w-full overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-xl">
                  <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-r from-blue-950 via-blue-700 to-cyan-500" />
                  <div className="flex w-full flex-col p-6">
                    <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="min-w-0"><div className="truncate text-lg font-black uppercase tracking-tight">{companyName || 'Embroidery Statement'}</div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-blue-700">Employee Identity Card</div></div>
                      <div className="rounded-xl bg-blue-50 p-2 text-blue-800"><IdCard size={25} /></div>
                    </div>
                    <div className="flex flex-1 gap-5">
                      <div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        {profilePhoto ? <img src={profilePhoto} alt={selectedWorker.full_name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-400"><Camera size={28} /></div>}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="text-xl font-black leading-tight">{selectedWorker.full_name}</div>
                        <div className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-800">{selectedWorker.worker_code}</div>
                        <div className="text-xs text-slate-600"><b>Designation:</b> {selectedWorker.designation || 'Worker'}</div>
                        <div className="text-xs text-slate-600"><b>Joining:</b> {dateLabel(selectedWorker.joining_date)}</div>
                        <div className="text-xs text-slate-600"><b>Phone:</b> {selectedWorker.phone || '—'}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3 text-[9px] text-slate-500"><span>{tr('এই কার্ডধারী কর্মী প্রতিষ্ঠানে কর্মরত আছেন।', 'This card confirms that the holder is employed by this company.')}</span><span className="font-bold uppercase tracking-widest">Official Staff Card</span></div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {tab === 'increments' && selectedWorker && (
            <section className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="text-xs text-slate-500">{tr('বর্তমান মাসিক বেতন', 'Current monthly salary')}</div><div className="mt-1 text-xl font-black">{money(selectedWorker.monthly_salary)}</div></div>
                <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="text-xs text-slate-500">{dueInfo(selectedWorker).latest || selectedWorker.salary_review_base_date ? tr('শেষ বেতন বেড়েছে', 'Last salary increase') : tr('যোগদানের তারিখ', 'Joining date')}</div><div className="mt-1 text-xl font-black">{dateLabel(dueInfo(selectedWorker).baseDate)}</div></div>
                <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="text-xs text-slate-500">{tr('আবার বেতন বাড়ানোর পর্যালোচনা', 'Next salary review')}</div><div className="mt-1 text-xl font-black">{dateLabel(dueInfo(selectedWorker).dueDate)}</div><div className="text-xs text-slate-500">{dueInfo(selectedWorker).eligible ? tr('পর্যালোচনার সময় হয়েছে', 'Review is due') : dueInfo(selectedWorker).days + tr(' দিন বাকি', ' days left')} · {tr('রিমাইন্ডার: ', 'Reminder: ')}{dateLabel(dueInfo(selectedWorker).reminderDate)}</div></div>
              </div>
              <form onSubmit={submitIncrement} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-black">{tr('বেতন বাড়ান', 'Increase salary')}</h3>
                <p className="mb-4 mt-1 text-sm text-slate-500">{tr('নতুন মোট মাসিক বেতন লিখে সেভ করুন। আপনি সেভ করলেই শুধু বেতন বদলাবে।', 'Enter the new total monthly salary and save. Salary changes only when you save.')}</p>
                <fieldset disabled={saving} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-bold">{tr('নতুন মাসিক বেতন (৳)', 'New monthly salary (BDT)')}<input type="number" inputMode="decimal" min={(Number(selectedWorker.monthly_salary)+0.01).toFixed(2)} step="0.01" required value={incrementValue} onChange={e=>setIncrementValue(e.target.value)} placeholder={tr('যেমন: ১৫০০০', 'e.g. 15000')} className="mt-2 w-full rounded-xl border bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800" /></label>
                    <label className="text-sm font-bold">{tr('কোন তারিখ থেকে', 'Effective from')}<input type="date" max={today()} required value={incrementDate} onChange={e=>setIncrementDate(e.target.value)} className="mt-2 w-full rounded-xl border bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800" /></label>
                  </div>
                  {Number(incrementValue)>Number(selectedWorker.monthly_salary)&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{money(selectedWorker.monthly_salary)} → <b>{money(Number(incrementValue))}</b> · {tr('বাড়ছে ', 'Increase: ')}{money((Math.round(Number(incrementValue)*100)-Math.round(Number(selectedWorker.monthly_salary)*100))/100)}<span className="mt-1 block text-xs">{tr('সেভ করলে পরের পর্যালোচনা: ', 'After saving, next review: ')}{incrementDate ? dateLabel(addCalendarYear([incrementDate, dueInfo(selectedWorker).baseDate].sort().at(-1)!)) : '—'}</span></p>}
                  <details><summary className="cursor-pointer text-xs text-slate-500">{tr('কারণ / নোট (ঐচ্ছিক)', 'Reason / note (optional)')}</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">{tr('কারণ', 'Reason')}<select value={incrementReason} onChange={e=>setIncrementReason(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><option value="annual_appraisal">{tr('বার্ষিক মূল্যায়ন', 'Annual review')}</option><option value="promotion">{tr('পদোন্নতি', 'Promotion')}</option><option value="performance">{tr('কর্মদক্ষতা', 'Performance')}</option><option value="market_adjustment">{tr('বাজার সমন্বয়', 'Market adjustment')}</option><option value="special">{tr('বিশেষ', 'Special')}</option></select></label><label className="text-xs font-bold">{tr('নোট', 'Note')}<input value={incrementNotes} onChange={e=>setIncrementNotes(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-50 p-3 dark:bg-slate-800" /></label></div></details>
                  <button disabled={saving||!Number.isFinite(Number(incrementValue))||Number(incrementValue)<=Number(selectedWorker.monthly_salary)} className="w-full rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50 sm:w-auto">{saving?tr('সংরক্ষণ হচ্ছে…', 'Saving…'):tr('নতুন বেতন সেভ করুন', 'Save new salary')}</button>
                </fieldset>
              </form>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><h3 className="mb-3 font-black">{tr('কবে কবে বেতন বেড়েছে', 'Salary increase history')}</h3><div className="space-y-3">{incrementRows.filter(r=>r.worker_id===selectedWorker.id).map(row=><div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><div><p className="text-sm font-bold">{dateLabel(row.effective_date)}</p><p className="mt-1 text-sm">{money(row.previous_salary)} → <b>{money(row.new_salary)}</b></p></div><span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">+{money(row.increment_amount)}</span></div>)}</div>{!incrementRows.some(r=>r.worker_id===selectedWorker.id)&&<p className="text-sm text-slate-500">{tr('এখনো বেতন বৃদ্ধির রেকর্ড নেই।', 'No salary increases recorded yet.')}</p>}</div>

            </section>
          )}

          {tab === 'advances' && selectedWorker && (
            <section className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="text-xs text-slate-500">{tr('মোট অগ্রিম', 'Total advances')}</div><div className="mt-1 text-xl font-black">{money(advances.filter(a => a.worker_id === selectedWorker.id).reduce((s, a) => s + Number(a.amount), 0))}</div></div>
                <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="text-xs text-slate-500">{tr('বকেয়া অগ্রিম', 'Outstanding advances')}</div><div className="mt-1 text-xl font-black text-amber-600">{money(advances.filter(a => a.worker_id === selectedWorker.id).reduce((s, a) => s + Number(a.outstanding_amount), 0))}</div></div>
                <div className="rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="text-xs text-slate-500">{tr('পরিশোধিত অগ্রিম', 'Recovered advances')}</div><div className="mt-1 text-xl font-black text-emerald-600">{money(advances.filter(a => a.worker_id === selectedWorker.id).reduce((s, a) => s + Math.max(0, Number(a.amount) - Number(a.outstanding_amount)), 0))}</div></div>
              </div>
              <form onSubmit={submitAdvance} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-3 flex items-center gap-2 font-black"><Wallet size={18} className="text-blue-600" />{tr('নতুন অগ্রিম বেতন রেকর্ড', 'Record a Salary Advance')}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-xs font-bold">{tr('টাকার পরিমাণ', 'Amount (BDT)')}<input type="number" min="1" step="0.01" required value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-50 p-3 dark:bg-slate-800" /></label>
                  <label className="text-xs font-bold">{tr('অগ্রিম দেওয়ার তারিখ', 'Advance date')}<input type="date" required value={advanceDate} onChange={e => setAdvanceDate(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-50 p-3 dark:bg-slate-800" /></label>
                  <label className="text-xs font-bold">{tr('যে মাসের বেতন থেকে কাটবে', 'Deduct from salary month')}<input type="month" required value={deductMonth} readOnly className="mt-1 w-full cursor-not-allowed rounded-xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200" /></label>
                  <label className="text-xs font-bold">{tr('কারণ', 'Reason')}<input value={advanceReason} onChange={e => setAdvanceReason(e.target.value)} placeholder={tr('যেমন: ব্যক্তিগত প্রয়োজন', 'e.g. Personal need')} className="mt-1 w-full rounded-xl bg-slate-50 p-3 dark:bg-slate-800" /></label>
                </div>
                <p className="mt-2 text-xs text-slate-500">{tr('এই কর্মীর বর্তমান Salary Cycle দেখানো হচ্ছে। নভেম্বরের বেতন ডিসেম্বরের যেদিনই Paid করবেন, তার আগে দেওয়া সব Advance নভেম্বর থেকেই কাটবে। বেতন Paid হলেই পরবর্তী মাসের Cycle স্বয়ংক্রিয়ভাবে চালু হবে।', 'This worker’s active salary cycle is shown here. Advances recorded before the November payroll is marked Paid remain assigned to November, even when payment happens in December. The next cycle starts automatically only after payroll is marked Paid.')}</p>
                <div className="mt-3 flex justify-end"><button disabled={saving} className="rounded-xl bg-blue-700 px-5 py-3 text-xs font-black text-white disabled:opacity-50">{saving ? tr('সংরক্ষণ হচ্ছে...', 'Saving...') : tr('অগ্রিম সংরক্ষণ ও SMS প্রস্তুত', 'Save advance & prepare SMS')}</button></div>
              </form>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="p-4 font-black">{tr('অগ্রিমের খতিয়ান', 'Advance Ledger')}</div><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800"><tr>{['Date','Given','Recovered','Outstanding','Salary Month','Status','Reason'].map(x => <th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{advances.filter(a => a.worker_id === selectedWorker.id).map(a => <tr key={a.id} className="border-t dark:border-slate-800"><td className="p-3">{dateLabel(a.request_date)}</td><td className="p-3 font-bold">{money(a.amount)}</td><td className="p-3 text-emerald-700">{money(Number(a.amount)-Number(a.outstanding_amount))}</td><td className="p-3">{money(a.outstanding_amount)}</td><td className="p-3">{a.deduct_from_month}</td><td className="p-3">{a.status === 'recovered' ? tr('সমন্বয় হয়েছে', 'Recovered') : tr('বকেয়া', 'Outstanding')}</td><td className="p-3">{a.reason||'—'}</td></tr>)}</tbody></table>{advances.filter(a => a.worker_id === selectedWorker.id).length === 0 && <p className="p-5 text-sm text-slate-500">{tr('কোনো Advance নেই।', 'No advances recorded.')}</p>}</div>
            </section>
          )}

          {tab === 'annual' && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div><h3 className="font-black">{tr('বার্ষিক বেতন ও নগদ খরচ', 'Annual Salary & Cash Outflow')}</h3><p className="text-xs text-slate-500">{tr('বেতন পরিশোধের তারিখ এবং অগ্রিম দেওয়ার নির্বাচিত তারিখ অনুযায়ী হিসাব।', 'Grouped by actual salary payment date and the selected advance date.')}</p></div><div className="flex gap-2"><select value={year} onChange={e => setYear(Number(e.target.value))} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">{Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 10 + i).map(y => <option key={y} value={y}>{y}</option>)}</select><button onClick={exportAnnualCsv} className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white"><Download size={13} className="mr-1 inline" />CSV</button></div></div>
              {annualLoading ? <p className="p-5 text-sm text-slate-500"><Loader2 className="mr-2 inline animate-spin" size={15} />Loading annual report...</p> : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[['Gross Salary Expense', annualTotals.gross], ['Net Salary Paid', annualTotals.netPaid], ['Advances Disbursed', annualTotals.advancesGiven], ['Total Cash Outflow', annualTotals.cashOutflow]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="text-xs text-slate-500">{tr(label === 'Gross Salary Expense' ? 'মোট বেতন ব্যয়' : label === 'Net Salary Paid' ? 'পরিশোধিত নেট বেতন' : label === 'Advances Disbursed' ? 'মোট অগ্রিম প্রদান' : 'মোট নগদ বহির্গমন', String(label))}</div><div className="mt-1 text-xl font-black">{money(Number(value))}</div></div>)}
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800"><tr>{['Month','Gross Salary Expense','Net Salary Paid','Advances Given','Advance Recovered*','Cash Outflow'].map(x => <th key={x} className="p-3">{tr(x === 'Month' ? 'মাস' : x === 'Gross Salary Expense' ? 'মোট বেতন ব্যয়' : x === 'Net Salary Paid' ? 'নেট বেতন পরিশোধ' : x === 'Advances Given' ? 'অগ্রিম প্রদান' : x === 'Advance Recovered*' ? 'অগ্রিম সমন্বয়*' : 'নগদ বহির্গমন', x)}</th>)}</tr></thead><tbody>{annualRows.map(row => <tr key={row.monthKey} className="border-t dark:border-slate-800"><td className="p-3 font-bold">{row.monthKey}</td><td className="p-3">{money(row.gross)}</td><td className="p-3">{money(row.netPaid)}</td><td className="p-3">{money(row.advancesGiven)}</td><td className="p-3">{money(row.advanceRecovered)}</td><td className="p-3 font-black">{money(row.cashOutflow)}</td></tr>)}<tr className="border-t bg-slate-50 font-black dark:border-slate-800 dark:bg-slate-800"><td className="p-3">TOTAL</td><td className="p-3">{money(annualTotals.gross)}</td><td className="p-3">{money(annualTotals.netPaid)}</td><td className="p-3">{money(annualTotals.advancesGiven)}</td><td className="p-3">{money(annualTotals.advanceRecovered)}</td><td className="p-3">{money(annualTotals.cashOutflow)}</td></tr></tbody></table></div>
                  <p className="text-xs text-slate-500">{tr('*Advance recovered is informational only. It is not added again to cash outflow; cash outflow = net salary actually paid + advances actually disbursed.', '*অগ্রিম সমন্বয় তথ্য হিসেবে দেখানো হয়েছে; Cash Outflow-তে দ্বিতীয়বার যোগ হয়নি। Cash Outflow = প্রকৃত Net Salary Paid + Advance Disbursed.')}</p>
                </>
              )}
            </section>
          )}

          {tab === 'sms' && (
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="font-black">{tr('SMS পাঠানোর ইতিহাস', 'SMS Sending History')}</h3><p className="text-xs text-slate-500">{tr('Accepted মানে DNotify অনুরোধ গ্রহণ করেছে; এটি মোবাইলে Delivered হওয়ার নিশ্চয়তা নয়।', 'Accepted means DNotify accepted the request; it is not a handset delivery confirmation.')}</p></div>
                <div className="flex gap-2">
                  <button onClick={loadSmsLogs} disabled={smsLogsLoading} className="rounded-lg border px-3 py-2 text-xs font-bold dark:border-slate-700"><RefreshCw size={13} className="mr-1 inline" />{tr('রিফ্রেশ', 'Refresh')}</button>
                  <button onClick={() => selectedWorker && setSmsDraft({ worker: selectedWorker, message: '', eventType: 'custom', idempotencyKey: crypto.randomUUID() })} disabled={!selectedWorker?.phone} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><MessageSquare size={13} className="mr-1 inline" />{tr('Custom SMS', 'Compose SMS')}</button>
                </div>
              </div>
              {smsLogsLoading ? <p className="py-8 text-center text-sm text-slate-500"><Loader2 size={16} className="mr-2 inline animate-spin" />{tr('লোড হচ্ছে...', 'Loading...')}</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800"><tr>{['Date', 'Worker', 'Mobile', 'Type', 'Mode', 'Status', 'Attempts', 'Details'].map(x => <th key={x} className="p-3">{x}</th>)}</tr></thead>
                    <tbody>{smsLogs.map(log => {
                      const logWorker = workers.find(w => w.id === log.worker_id);
                      return <tr key={log.id} className="border-t dark:border-slate-800">
                        <td className="p-3 whitespace-nowrap">{dateLabel(log.created_at)}</td>
                        <td className="p-3 font-bold">{logWorker?.full_name || 'Worker'}</td>
                        <td className="p-3">{log.mobile}</td>
                        <td className="p-3">{log.event_type.replace('_', ' ')}</td>
                        <td className="p-3">{log.sms_mode}</td>
                        <td className="p-3"><span className={'rounded-full px-2 py-1 text-[10px] font-black ' + (log.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : log.status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700')}>{log.status === 'accepted' ? tr('Gateway Accepted', 'Gateway Accepted') : log.status}</span></td>
                        <td className="p-3">{log.attempts}</td>
                        <td className="p-3 text-xs"><div className="max-w-[240px] truncate" title={log.message}>{log.message}</div>{log.error_message && <div className="mt-1 text-rose-600">{log.error_message}</div>}{log.status === 'failed' && <button onClick={() => { const target = workers.find(w => w.id === log.worker_id); if (target) setSmsDraft({ worker: target, message: log.message, eventType: log.event_type, relatedId: log.related_id || undefined, idempotencyKey: log.idempotency_key }); }} className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">{tr('আবার চেষ্টা', 'Retry')}</button>}</td>
                      </tr>;
                    })}</tbody>
                  </table>
                  {smsLogs.length === 0 && <p className="py-8 text-center text-sm text-slate-500">{tr('এখনো কোনো SMS পাঠানো হয়নি।', 'No SMS requests yet.')}</p>}
                </div>
              )}
            </section>
          )}

          {tab === 'payslip' && (
            <section className="space-y-4">
              <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <label className="text-xs font-bold">{tr('বেতন মাস', 'Salary month')}<input type="month" value={slipMonth} onChange={e => setSlipMonth(e.target.value)} className="mt-1 block rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800" /></label>
                <label className="text-xs font-bold">{tr('কর্মী', 'Worker')}<select value={slipWorkerId} onChange={e => setSlipWorkerId(e.target.value)} className="mt-1 block min-w-[220px] rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">{workers.map(w => <option key={w.id} value={w.id}>{w.worker_code} — {w.full_name}</option>)}</select></label>
                <button onClick={loadMonthPayroll} className="self-end rounded-xl border px-3 py-3 text-xs font-bold dark:border-slate-700"><RefreshCw size={14} className="mr-1 inline" />{tr('লোড করুন', 'Load')}</button>
              </div>
              {selectedSlip && slipWorker ? (
                <>
                  <div className="flex flex-wrap gap-2"><button onClick={() => exportElement(slipRef.current, 'Salary-Slip-' + slipWorker.worker_code + '-' + slipMonth, 'print')} className="rounded-lg border px-3 py-2 text-xs font-bold dark:border-slate-700"><Printer size={13} className="mr-1 inline" />{tr('প্রিন্ট', 'Print')}</button><button onClick={() => exportElement(slipRef.current, 'Salary-Slip-' + slipWorker.worker_code + '-' + slipMonth, 'pdf')} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white"><Download size={13} className="mr-1 inline" />PDF</button><button onClick={() => exportElement(slipRef.current, 'Salary-Slip-' + slipWorker.worker_code + '-' + slipMonth, 'png')} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold dark:bg-slate-800">PNG</button>{selectedSlip.status === 'paid' && <button onClick={requestSlipSms} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><MessageSquare size={13} className="mr-1 inline" />{tr('SMS তৈরি করুন', 'Customize SMS')}</button>}</div>
                  <div className="overflow-x-auto rounded-xl bg-slate-100 p-4 dark:bg-slate-950"><div ref={slipRef} className="mx-auto w-[620px] max-w-full rounded-2xl border border-slate-200 bg-white p-7 text-slate-900 shadow-xl">
                    <div className="flex items-start justify-between border-b-2 border-blue-800 pb-4"><div><div className="text-2xl font-black">{companyName || 'Embroidery Statement'}</div><div className="mt-1 text-xs uppercase tracking-[.2em] text-blue-700">{selectedSlip.status === 'paid' ? 'Salary Payment Receipt' : 'Salary Statement — Not Paid'}</div></div><div className="rounded-xl bg-blue-50 p-3 text-blue-800"><FileText size={26} /></div></div>
                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><span className="text-xs text-slate-500">Worker</span><div className="font-black">{slipWorker.full_name}</div></div><div><span className="text-xs text-slate-500">Worker ID</span><div className="font-black">{slipWorker.worker_code}</div></div><div><span className="text-xs text-slate-500">Salary Month</span><div className="font-bold">{slipMonth}</div></div><div><span className="text-xs text-slate-500">Payment Date</span><div className="font-bold">{dateLabel(selectedSlip.paid_at)}</div></div></div>
                    <table className="mt-6 w-full text-sm"><tbody>
                      <tr className="border-b"><td className="py-3">Basic salary</td><td className="py-3 text-right font-bold">{money(selectedSlip.basic_salary)}</td></tr>
                      <tr className="border-b"><td className="py-3">Overtime ({selectedSlip.overtime_hours} hours)</td><td className="py-3 text-right font-bold">{money(selectedSlip.overtime_amount)}</td></tr>
                      <tr className="border-b"><td className="py-3">Attendance bonus</td><td className="py-3 text-right font-bold">{money(selectedSlip.attendance_bonus || 0)}</td></tr>
                      <tr className="border-b"><td className="py-3">Other bonus</td><td className="py-3 text-right font-bold">{money(selectedSlip.bonus)}</td></tr>
                      <tr className="border-b"><td className="py-3">Other deductions</td><td className="py-3 text-right font-bold">−{money(selectedSlip.deduction)}</td></tr>
                      <tr className="border-b"><td className="py-3">Advance recovery</td><td className="py-3 text-right font-bold">−{money(selectedSlip.advance_deduction || 0)}</td></tr>
                      <tr><td className="py-4 text-base font-black">{selectedSlip.status === 'paid' ? 'Net paid' : 'Net salary due'}</td><td className="py-4 text-right text-xl font-black text-emerald-700">{money(selectedSlip.net_salary)}</td></tr>
                    </tbody></table>
                    <div className="mt-8 flex justify-between gap-8 text-xs text-slate-500"><div className="border-t border-slate-300 pt-2">{tr('কর্মীর স্বাক্ষর', 'Worker signature')}</div><div className="border-t border-slate-300 pt-2">{tr('কর্তৃপক্ষের স্বাক্ষর', 'Authorized signature')}</div></div>
                    <div className="mt-5 border-t border-dashed pt-3 text-center text-[10px] text-slate-400">{companyName || 'Embroidery Statement'} · {tr('বেতন পরিশোধের রসিদ', 'Official salary payment receipt')}</div>
                  </div></div>
                  {selectedSlip.status !== 'paid' && <p className="text-xs font-bold text-amber-600">{tr('এই মাসের বেতন এখনো Paid করা হয়নি।', 'This payroll has not been marked as paid yet.')}</p>}
                </>
              ) : <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500 dark:border-slate-700">{tr('এই মাসে এই কর্মীর কোনো Payroll পাওয়া যায়নি। আগে Monthly Payroll থেকে বেতন হিসাব সংরক্ষণ করুন।', 'No payroll found for this worker and month. Save the payroll from Monthly Payroll first.')}</div>}
            </section>
          )}
        </>
      )}

      {smsDraft && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between"><div><h3 className="font-black">{tr('SMS বার্তা সম্পাদনা', 'Edit SMS Message')}</h3><p className="text-xs text-slate-500">{smsDraft.worker.full_name} · {smsDraft.worker.phone || 'No phone number'}</p></div><button onClick={() => setSmsDraft(null)} className="rounded-lg p-2 text-slate-500"><X size={18} /></button></div>
            <textarea value={smsDraft.message} onChange={e => setSmsDraft({ ...smsDraft, message: e.target.value })} rows={5} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <p className="mt-2 text-xs text-slate-500">{tr('DNotify Non-Masking Gateway দিয়ে SMS পাঠানো হবে। প্রতি SMS-এ আপনার DNotify Wallet থেকে চার্জ কাটা হবে।', 'This sends through the DNotify Non-Masking Gateway. Your DNotify wallet is charged per SMS.')}</p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button onClick={async () => { try { await navigator.clipboard.writeText(smsDraft.message); setNotice(tr('SMS কপি হয়েছে।', 'SMS copied.')); } catch { setError('Clipboard permission was denied.'); } }} className="rounded-xl border px-4 py-2 text-xs font-bold dark:border-slate-700">{tr('কপি করুন', 'Copy message')}</button>
              <button onClick={sendSmsDraft} disabled={smsSending || !smsDraft.worker.phone || !smsDraft.message.trim()} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50">{smsSending ? tr('পাঠানো হচ্ছে...', 'Sending...') : tr('DNotify দিয়ে পাঠান', 'Send via DNotify')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerManagementExtras;
