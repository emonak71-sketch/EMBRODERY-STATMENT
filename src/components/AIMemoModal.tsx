import React, { useState } from 'react';
import { Party, TransactionEntry } from '../types';
import { Sparkles, Upload, Mic, Copy, Check, FileText, AlertCircle, RefreshCw, X, ArrowRight, Smartphone, Code } from 'lucide-react';

interface AIMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  parties: Party[];
  onAddTransaction: (transaction: Omit<TransactionEntry, 'id'>) => void;
}

export const AIMemoModal: React.FC<AIMemoModalProps> = ({
  isOpen,
  onClose,
  parties,
  onAddTransaction,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedResult, setProcessedResult] = useState<any | null>(null);
  const [copiedJSON, setCopiedJSON] = useState(false);
  const [copiedSMS, setCopiedSMS] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('আপনার ব্রাউজারে স্পিচ রিকগনিশন সাপোর্ট করে না। অনুগ্রহ করে লেখা ইনপুট দিন।');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'bn-BD'; // Bengali language audio recognition
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsRecording(false);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const handleProcessAI = async () => {
    if (!inputText && !imagePreview) {
      setError('অনুগ্রহ করে চালানের বর্ণনা লিখুন, ভয়েসে বলুন অথবা মেমোর ছবি আপলোড করুন।');
      return;
    }

    setLoading(true);
    setError(null);
    setProcessedResult(null);

    const selectedParty = parties.find((p) => p.id === selectedPartyId);
    const prevBal = selectedParty ? selectedParty.current_balance : 0;

    try {
      const response = await fetch('/api/process-memo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_text: inputText,
          image_base64: imagePreview,
          current_party_balance: prevBal,
        }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'AI প্রসেসিং এ সমস্যা হয়েছে');
      }

      setProcessedResult(resData.data);
    } catch (err: any) {
      setError(err.message || 'সার্ভারে সংযোগ করা যাচ্ছে না।');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSave = () => {
    if (!processedResult) return;

    onAddTransaction({
      party_name: processedResult.party_name,
      mobile: processedResult.mobile,
      memo_no: processedResult.memo_no,
      date: processedResult.date,
      pcs: processedResult.pcs,
      rate: processedResult.rate,
      total_amount: processedResult.total_amount,
      transaction_type: processedResult.transaction_type,
      previous_balance: processedResult.previous_balance,
      updated_balance: processedResult.updated_balance,
      sms_draft: processedResult.sms_draft,
      item_description: processedResult.item_description,
    });

    onClose();
  };

  const handleCopyJSON = () => {
    if (!processedResult) return;
    navigator.clipboard.writeText(JSON.stringify(processedResult, null, 2));
    setCopiedJSON(true);
    setTimeout(() => setCopiedJSON(false), 2000);
  };

  const handleCopySMS = () => {
    if (!processedResult?.sms_draft) return;
    navigator.clipboard.writeText(processedResult.sms_draft);
    setCopiedSMS(true);
    setTimeout(() => setCopiedSMS(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                AI মেমো প্রসেসর ও অটোমেটিক ব্যালেন্স ইন্টেলিজেন্স
              </h3>
              <p className="text-xs text-slate-400">
                বাংলায় ভয়েস, টেক্সট বা ছবি দিলে অটোমেটিক মেমো ও SMS জেনারেট হবে
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Party selector optional match */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              পার্টি সিলেক্ট করুন (ঐচ্ছিক পূর্ববর্তী ব্যালেন্স মেলানোর জন্য):
            </label>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="">-- নতুন বা যেকোনো পার্টি --</option>
              {parties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.name} - (বর্তমান বাকি: ৳ {party.current_balance.toLocaleString('bn-BD')})
                </option>
              ))}
            </select>
          </div>

          {/* Voice & Text Memo Entry */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                চালানের বিবরণ / ভয়েস ইনপুট:
              </label>
              <button
                type="button"
                onClick={handleVoiceInput}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  isRecording
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                    : 'bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 border border-primary-500/30'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isRecording ? 'শুনছি... বলুন' : 'ভয়েসে বলুন'}</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="উদাহরণ: রহিম ট্রেডার্সকে ১২০ পিস শার্ট ৪৫০ টাকা দরে ডেলিভারি দেওয়া হলো মেমো ১০২৪। অথবা আলামিন ফেব্রিক্স থেকে ৫০,০০০ টাকা জমা পাওয়া গেছে।"
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-primary-500 placeholder-slate-600"
            />
          </div>

          {/* Image Memo Receipt Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              চালানের ছবির স্ক্যান / ফটো (OCR Upload):
            </label>
            <div className="flex items-center space-x-3">
              <label className="flex-1 flex items-center justify-center px-4 py-3 bg-slate-950 border border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-primary-500 text-slate-400 hover:text-slate-200 text-xs font-medium transition-all">
                <Upload className="w-4 h-4 mr-2 text-primary-400" />
                <span>ক্যাশ মেমো / রশিদ ছবি আপলোড করুন</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              {imagePreview && (
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex-shrink-0">
                  <img src={imagePreview} alt="Receipt preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setImagePreview(null)}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-slate-900/80 rounded-full text-slate-300 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center space-x-2 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Process Button */}
          <button
            onClick={handleProcessAI}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI মেমো এনালাইসিস চলছে...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>হিসাব গণনাকরণ ও মেমো তৈরি করুন</span>
              </>
            )}
          </button>

          {/* Processed Results Output Display */}
          {processedResult && (
            <div className="mt-6 space-y-4 pt-4 border-t border-slate-800 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>AI গণনাকৃত লেজার এন্ট্রি রেজাল্ট</span>
                </h4>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyJSON}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all flex items-center space-x-1"
                  >
                    {copiedJSON ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5" />}
                    <span>{copiedJSON ? 'Copied' : 'JSON Output'}</span>
                  </button>
                  <button
                    onClick={handleCopySMS}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all flex items-center space-x-1"
                  >
                    {copiedSMS ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Smartphone className="w-3.5 h-3.5 text-primary-400" />}
                    <span>{copiedSMS ? 'Copied SMS' : 'Copy SMS'}</span>
                  </button>
                </div>
              </div>

              {/* Transaction Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">পার্টি নাম:</span>
                  <span className="font-bold text-slate-200">{processedResult.party_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">মেমো নং:</span>
                  <span className="font-mono text-primary-400 font-bold">{processedResult.memo_no}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">তারিখ:</span>
                  <span className="text-slate-300">{processedResult.date}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">পরিমাণ (Pcs x Rate):</span>
                  <span className="text-slate-300">
                    {processedResult.pcs > 0 ? `${processedResult.pcs} পিস × ৳${processedResult.rate}` : 'পেমেন্ট জমা'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">মোট টাকা:</span>
                  <span className="font-bold text-emerald-400">৳ {processedResult.total_amount.toLocaleString('bn-BD')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">লেনদেনের ধরণ:</span>
                  <span className={`font-bold ${processedResult.transaction_type === 'BAKI (+)' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {processedResult.transaction_type}
                  </span>
                </div>
              </div>

              {/* Balance Math Verification */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">পূর্বের বাকি: </span>
                  <span className="font-semibold text-slate-200">৳ {processedResult.previous_balance.toLocaleString('bn-BD')}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600" />
                <div>
                  <span className="text-slate-400">বর্তমান মোট বাকি: </span>
                  <span className="font-bold text-amber-400 text-sm">৳ {processedResult.updated_balance.toLocaleString('bn-BD')}</span>
                </div>
              </div>

              {/* SMS Draft Preview Box */}
              <div className="p-3.5 bg-blue-950/20 border border-blue-800/40 rounded-xl">
                <span className="text-[11px] font-bold text-primary-400 block mb-1 uppercase tracking-wider flex items-center space-x-1">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>কাস্টমার বাংলা SMS ড্রাফট:</span>
                </span>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">{processedResult.sms_draft}</p>
              </div>

              {/* Action Save Button */}
              <button
                onClick={handleConfirmSave}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>লেজারে সেভ করুন এবং ব্যালেন্স আপডেট করুন</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
