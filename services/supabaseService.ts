
// Import supabaseUrl directly to fix protected property access error
import { supabase, supabaseUrl } from './supabaseClient';
import { Party, Transaction } from '../types';

const isConfigured = () => {
  return !supabaseUrl.includes('placeholder-project.supabase.co');
};

const handleDbError = (error: any, context: string) => {
  console.error(`Database Error [${context}]:`, error);
  const msg = error.message?.toLowerCase() || "";
  
  if (msg.includes("column") && msg.includes("not exist")) {
    const columnName = msg.split("'")[1] || "unknown";
    alert(`Database Schema Error!\n\nThe column '${columnName}' is missing in your database.\n\nPlease go to Supabase SQL Editor and run the migration script provided.`);
  } else {
    alert(`Error ${context}: ${error.message || 'Unknown database error'}`);
  }
  return error;
};

export const dbService = {
  login: async (email: string, pass: string) => {
    if (!isConfigured()) return { success: false, message: 'Supabase ব্যাকএন্ড কনফিগার করা নেই।' };
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pass });
    if (error) {
      let msg = error.message;
      if (error.message.includes('Invalid login credentials')) {
        msg = 'ইমেইল বা পাসওয়ার্ড ভুল হয়েছে। সঠিক তথ্য দিয়ে চেষ্টা করুন।';
      } else if (error.message.includes('Email not confirmed')) {
        msg = 'আপনার ইমেইল যাচাই হয়নি। Gmail-এ পাঠানো ৬ সংখ্যার OTP দিয়ে Signup verification সম্পন্ন করুন।';
      }
      return { success: false, message: msg };
    }
    return { success: true, user: { id: data.user.id, email: data.user.email!, business_name: data.user.user_metadata?.business_name || 'EMBRODERY STATEMENT' } };
  },
  
  signup: async (email: string, pass: string, businessName: string) => {
    if (!isConfigured()) return { success: false, message: 'Supabase ব্যাকএন্ড কনফিগার করা নেই।' };
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: pass,
      options: { data: { business_name: businessName } }
    });
    if (error) {
      const lowerMessage = error.message?.toLowerCase() || '';
      let msg = error.message;
      if (error.code === 'user_already_exists' || lowerMessage.includes('already registered') || lowerMessage.includes('already exists')) {
        msg = 'এই Gmail দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট আছে। লগ-ইন করুন অথবা পাসওয়ার্ড ভুলে গেলে Forgot Password ব্যবহার করুন।';
      } else if (lowerMessage.includes('password')) {
        msg = 'পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে।';
      } else if (lowerMessage.includes('rate limit')) {
        msg = 'অনেকবার OTP চাওয়া হয়েছে। কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন।';
      }
      return { success: false, message: msg };
    }

    if (!data.user) {
      return { success: false, message: 'অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।' };
    }

    // Supabase deliberately returns an empty identities array for an existing email
    // in some confirmation-enabled signup flows to avoid revealing account details.
    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { success: false, message: 'এই Gmail দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট আছে। লগ-ইন করুন অথবা Forgot Password ব্যবহার করুন।' };
    }

    const requiresVerification = !data.session;
    return {
      success: true,
      requiresVerification,
      user: { id: data.user.id, email: data.user.email!, business_name: businessName },
      message: requiresVerification
        ? 'আপনার Gmail-এ ৬ সংখ্যার OTP পাঠানো হয়েছে। অ্যাকাউন্ট চালু করতে কোডটি লিখুন।'
        : 'অ্যাকাউন্ট তৈরি ও ইমেইল যাচাই সফল হয়েছে।'
    };
  },

  verifySignupCode: async (email: string, token: string) => {
    if (!isConfigured()) return { success: false, message: 'Supabase ব্যাকএন্ড কনফিগার করা নেই।' };
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.replace(/\D/g, '');
    if (!/^\d{6}$/.test(cleanToken)) {
      return { success: false, message: '৬ সংখ্যার সঠিক কোডটি লিখুন।' };
    }
    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'email'
    });
    if (error) {
      console.error('Signup OTP verification failed:', error);
      return { success: false, message: 'কোডটি ভুল অথবা মেয়াদ শেষ হয়েছে। নতুন কোড নিন।' };
    }
    if (!data.session || !data.user) {
      return { success: false, message: 'ইমেইল যাচাই সম্পন্ন হয়নি। আবার কোডটি যাচাই করুন।' };
    }
    return { success: true, message: 'ইমেইল যাচাই সফল হয়েছে। আপনার অ্যাকাউন্টে প্রবেশ করা হচ্ছে।' };
  },

  resendSignupCode: async (email: string) => {
    if (!isConfigured()) return { success: false, message: 'Supabase ব্যাকএন্ড কনফিগার করা নেই।' };
    const cleanEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.resend({ type: 'signup', email: cleanEmail });
    if (error) {
      console.error('Signup OTP resend failed:', error);
      return { success: false, message: 'নতুন OTP পাঠানো যায়নি। কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন।' };
    }
    return { success: true, message: 'আপনার Gmail-এ নতুন ৬ সংখ্যার OTP পাঠানো হয়েছে।' };
  },

  updateProfile: async (email: string, businessName: string) => {
    if (!isConfigured()) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.updateUser({ email, data: { business_name: businessName } });
    if (error) throw error;
    return { id: data.user.id, email: data.user.email!, business_name: data.user.user_metadata?.business_name || businessName };
  },

  logout: async () => { if (isConfigured()) await supabase.auth.signOut({ scope: 'local' }); },

  getInitialData: async () => {
    if (!isConfigured()) return { parties: [], transactions: [], products: [], expenses: [], sales: [] };
    try {
      const [parties, txs, products, expenses, sales] = await Promise.all([
        supabase.from('Parties').select('*'),
        supabase.from('Transactions').select('*').order('date', { ascending: true }),
        supabase.from('Products').select('*'),
        supabase.from('Expenses').select('*'),
        supabase.from('Sales').select('*'),
      ]);
      return { parties: parties.data || [], transactions: txs.data || [], products: products.data || [], expenses: expenses.data || [], sales: sales.data || [] };
    } catch (err) { return { parties: [], transactions: [], products: [], expenses: [], sales: [] }; }
  },

  addParty: async (party: Omit<Party, 'id' | 'created_at'>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    const payload = userId ? { ...party, user_id: userId } : party;
    const { data, error } = await supabase.from('Parties').insert([payload]).select();
    if (error) throw handleDbError(error, 'adding party');
    return data?.[0];
  },

  updateParty: async (id: string, updates: Partial<Party>) => {
    const { data, error } = await supabase.from('Parties').update(updates).eq('id', id).select();
    if (error) throw handleDbError(error, 'updating party');
    return data?.[0];
  },

  deleteParty: async (id: string) => {
    const { error } = await supabase.from('Parties').delete().eq('id', id);
    if (error) throw handleDbError(error, 'deleting party');
    return true;
  },

  addTransaction: async (tx: Omit<Transaction, 'id' | 'created_at'>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    const payload = {
      party_id: tx.party_id,
      date: tx.date,
      bill_no: tx.bill_no,
      details: tx.details,
      pcs: tx.pcs || 0,
      rate: tx.rate || 0,
      credit: tx.credit || 0,
      payment: tx.payment || 0,
      ...(userId ? { user_id: userId } : {})
    };
    const { data, error } = await supabase.from('Transactions').insert([payload]).select();
    if (error) throw handleDbError(error, 'adding transaction');
    return data?.[0];
  },

  updateTransaction: async (id: string, updates: Partial<Transaction>) => {
    const { data, error } = await supabase.from('Transactions').update(updates).eq('id', id).select();
    if (error) throw handleDbError(error, 'updating transaction');
    return data?.[0];
  },

  deleteTransaction: async (id: string) => {
    const { error } = await supabase.from('Transactions').delete().eq('id', id);
    if (error) throw handleDbError(error, 'deleting transaction');
    return true;
  },
  

  // Worker Attendance & Payroll: all operations are scoped to the signed-in account.
  getWorkers: async () => {
    const {data:{session}}=await supabase.auth.getSession(); const uid=session?.user?.id;
    if(!uid) throw new Error('Please sign in again.');
    const {data,error}=await supabase.from('Workers').select('*').eq('user_id',uid).order('full_name');
    if(error) throw handleDbError(error,'loading workers'); return data||[];
  },
  saveWorker: async (worker:{id?:string;worker_code:string;full_name:string;phone:string;designation:string;joining_date:string;monthly_salary:number;is_active:boolean}) => {
    const {data:{session}}=await supabase.auth.getSession(); const uid=session?.user?.id;
    if(!uid) throw new Error('Please sign in again.');
    const payload={...worker,user_id:uid,updated_at:new Date().toISOString()};
    const q=worker.id?supabase.from('Workers').update(payload).eq('id',worker.id).eq('user_id',uid):supabase.from('Workers').insert([{...payload,created_at:new Date().toISOString()}]);
    const {data,error}=await q.select(); if(error) throw handleDbError(error,'saving worker');
    if(!data?.length) throw new Error('Worker was not saved. Check account permissions.'); return data[0];
  },
  setWorkerActive: async (id:string,is_active:boolean) => {
    const {data:{session}}=await supabase.auth.getSession(); const uid=session?.user?.id;
    if(!uid) throw new Error('Please sign in again.');
    const {data,error}=await supabase.from('Workers').update({is_active,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',uid).select();
    if(error) throw handleDbError(error,'updating worker'); if(!data?.length) throw new Error('Worker not found.'); return data[0];
  },
  getWorkerAttendance: async (date:string) => {
    const {data:{session}}=await supabase.auth.getSession(); const uid=session?.user?.id;
    if(!uid) throw new Error('Please sign in again.');
    const {data,error}=await supabase.from('WorkerAttendance').select('*').eq('user_id',uid).eq('attendance_date',date);
    if(error) throw handleDbError(error,'loading attendance'); return data||[];
  },
  getWorkerAttendanceForMonth: async (month:string) => {
    const {data:{session}}=await supabase.auth.getSession(); const uid=session?.user?.id;
    if(!uid) throw new Error('Please sign in again.');
    const [year,monthNumber]=month.split('-').map(Number);
    const lastDay=new Date(year,monthNumber,0).getDate();
    const start=month+'-01', end=month+'-'+String(lastDay).padStart(2,'0');
    const {data,error}=await supabase.from('WorkerAttendance').select('*').eq('user_id',uid).gte('attendance_date',start).lte('attendance_date',end);
    if(error) throw handleDbError(error,'loading monthly attendance'); return data||[];
  },
  saveWorkerAttendance: async (rows:Array<{worker_id:string;attendance_date:string;status:string;check_in?:string|null;check_out?:string|null;note?:string}>) => {
    const {data:{session}}=await supabase.auth.getSession(); const uid=session?.user?.id;
    if(!uid) throw new Error('Please sign in again.');
    const payload=rows.map(r=>({...r,user_id:uid,updated_at:new Date().toISOString()}));
    const {data,error}=await supabase.from('WorkerAttendance').upsert(payload,{onConflict:'user_id,worker_id,attendance_date'}).select();
    if(error) throw handleDbError(error,'saving attendance'); return data||[];
  },
  getWorkerPayroll: async (month:string) => {
    const {data:{session}}=await supabase.auth.getSession(); const uid=session?.user?.id;
    if(!uid) throw new Error('Please sign in again.');
    const {data,error}=await supabase.from('WorkerPayroll').select('*').eq('user_id',uid).eq('month_key',month);
    if(error) throw handleDbError(error,'loading payroll'); return data||[];
  },
  saveWorkerPayroll: async (p:{worker_id:string;month_key:string;basic_salary:number;overtime_hours:number;overtime_amount:number;bonus:number;deduction:number;net_salary:number;status:'draft'|'paid';paid_at:string|null}) => {
    const {data:{session}}=await supabase.auth.getSession(); const uid=session?.user?.id;
    if(!uid) throw new Error('Please sign in again.');
    const {data,error}=await supabase.from('WorkerPayroll').upsert({...p,user_id:uid,updated_at:new Date().toISOString()},{onConflict:'user_id,worker_id,month_key'}).select();
    if(error) throw handleDbError(error,'saving payroll'); return data?.[0];
  },

  // Worker documents are stored in a private account-scoped bucket.
  // Send SMS through the authenticated DNotify Edge Function. API tokens never enter the browser.
  sendWorkerSms: async (payload: {
    worker_id: string;
    event_type: 'salary_paid' | 'advance_paid' | 'custom';
    related_id?: string;
    idempotency_key?: string;
    message: string;
  }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Please sign in again.');
    const { data, error } = await supabase.functions.invoke('send-worker-sms', {
      body: payload,
      headers: { Authorization: 'Bearer ' + session.access_token }
    });
    if (error) throw new Error(error.message || 'DNotify SMS request failed.');
    if (!data?.ok && !data?.duplicate) throw new Error(data?.error || 'DNotify did not accept the SMS.');
    return data;
  },

  getWorkerSmsLogs: async (limit = 100) => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) throw new Error('Please sign in again.');
    const { data, error } = await supabase
      .from('WorkerSmsLogs')
      .select('id, worker_id, event_type, related_id, idempotency_key, mobile, message, sms_mode, sender_id, status, error_message, attempts, created_at, accepted_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(limit, 200)));
    if (error) throw handleDbError(error, 'loading SMS history');
    return data || [];
  },

  getWorkerDocuments: async (workerId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) throw new Error('Please sign in again.');
    const { data, error } = await supabase
      .from('WorkerDocuments')
      .select('*')
      .eq('user_id', uid)
      .eq('worker_id', workerId)
      .order('uploaded_at', { ascending: false });
    if (error) throw handleDbError(error, 'loading worker documents');
    return data || [];
  },

  uploadWorkerDocument: async (
    workerId: string,
    documentType: 'profile_photo' | 'nid_front' | 'nid_back' | 'birth_certificate' | 'driving_license' | 'passport' | 'other',
    file: File
  ) => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) throw new Error('Please sign in again.');
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) throw new Error('Use JPG, PNG, WEBP or PDF files only.');
    if (file.size <= 0 || file.size > 10 * 1024 * 1024) throw new Error('File size must be 10 MB or less.');

    const { data: workerRow, error: workerCheckError } = await supabase
      .from('Workers')
      .select('id')
      .eq('id', workerId)
      .eq('user_id', uid)
      .maybeSingle();
    if (workerCheckError) throw handleDbError(workerCheckError, 'checking worker document ownership');
    if (!workerRow) throw new Error('Worker not found in this account.');

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || 'document';
    const uniquePart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : String(Date.now()) + '-' + Math.random().toString(36).slice(2, 9);
    const filePath = uid + '/' + workerId + '/' + documentType + '/' + uniquePart + '-' + safeName;

    const { error: uploadError } = await supabase.storage
      .from('worker-documents')
      .upload(filePath, file, { contentType: file.type, upsert: false });
    if (uploadError) throw handleDbError(uploadError, 'uploading worker document');

    const { data, error } = await supabase
      .from('WorkerDocuments')
      .insert([{
        user_id: uid,
        worker_id: workerId,
        document_type: documentType,
        file_path: filePath,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size
      }])
      .select()
      .single();

    if (error) {
      // Keep the uploaded object rather than risking deletion of a document.
      throw handleDbError(error, 'saving worker document details');
    }
    return data;
  },

  getWorkerDocumentSignedUrl: async (filePath: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) throw new Error('Please sign in again.');
    if (!filePath.startsWith(uid + '/')) throw new Error('This document does not belong to the current account.');
    const { data, error } = await supabase.storage
      .from('worker-documents')
      .createSignedUrl(filePath, 60 * 60);
    if (error) throw handleDbError(error, 'opening worker document');
    return data.signedUrl;
  },

  getWorkerSalaryIncrements: async (workerId?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) throw new Error('Please sign in again.');
    let query = supabase.from('WorkerSalaryIncrements').select('*').eq('user_id', uid);
    if (workerId) query = query.eq('worker_id', workerId);
    const { data, error } = await query.order('effective_date', { ascending: false });
    if (error) throw handleDbError(error, 'loading salary increment history');
    return data || [];
  },

  addWorkerSalaryIncrement: async (increment: {
    worker_id: string;
    previous_salary: number;
    increment_amount: number;
    increment_percentage: number;
    new_salary: number;
    effective_date: string;
    reason: string;
    notes?: string;
    approved_by?: string;
  }) => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) throw new Error('Please sign in again.');
    const { data, error } = await supabase
      .from('WorkerSalaryIncrements')
      .insert([{ ...increment, user_id: uid }])
      .select()
      .single();
    if (error) throw handleDbError(error, 'saving salary increment');
    return data;
  },

  getWorkerAdvances: async (workerId?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) throw new Error('Please sign in again.');
    let query = supabase.from('WorkerAdvances').select('*').eq('user_id', uid);
    if (workerId) query = query.eq('worker_id', workerId);
    const { data, error } = await query.order('request_date', { ascending: false });
    if (error) throw handleDbError(error, 'loading worker advances');
    return data || [];
  },

  addWorkerAdvance: async (advance: {
    worker_id: string;
    amount: number;
    request_date: string;
    deduct_from_month: string;
    reason: string;
  }) => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) throw new Error('Please sign in again.');
    const { data, error } = await supabase
      .from('WorkerAdvances')
      .insert([{
        ...advance,
        user_id: uid,
        outstanding_amount: advance.amount,
        status: 'outstanding',
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    if (error) throw handleDbError(error, 'recording worker advance');
    return data;
  },

  getWorkerPayrollForYear: async (year: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) throw new Error('Please sign in again.');
    const start = year + '-01-01T00:00:00+06:00';
    const end = (year + 1) + '-01-01T00:00:00+06:00';
    const { data, error } = await supabase
      .from('WorkerPayroll')
      .select('*')
      .eq('user_id', uid)
      .eq('status', 'paid')
      .gte('paid_at', start)
      .lt('paid_at', end)
      .order('paid_at', { ascending: true });
    if (error) throw handleDbError(error, 'loading annual salary report');
    return data || [];
  },

  getWorkerAdvancesForYear: async (year: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) throw new Error('Please sign in again.');
    const start = year + '-01-01T00:00:00+06:00';
    const end = (year + 1) + '-01-01T00:00:00+06:00';
    const { data, error } = await supabase
      .from('WorkerAdvances')
      .select('*')
      .eq('user_id', uid)
      .gte('disbursed_at', start)
      .lt('disbursed_at', end)
      .order('disbursed_at', { ascending: true });
    if (error) throw handleDbError(error, 'loading annual advance report');
    return data || [];
  },

  resetPassword: async (email: string) => {
    if (!isConfigured()) return { success: false, message: 'Supabase configuration is missing.' };
    const cleanEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
    if (error) {
      console.error('Password recovery email request failed:', error);
      return { success: false, message: 'ইমেইলে ৬ সংখ্যার কোড পাঠানো যায়নি। ইমেইল ঠিকানা যাচাই করে আবার চেষ্টা করুন।' };
    }
    return { success: true, message: 'আপনার Gmail-এ ৬ সংখ্যার যাচাইকরণ কোড পাঠানো হয়েছে।' };
  },

  verifyResetCode: async (email: string, token: string) => {
    if (!isConfigured()) return { success: false, message: 'Supabase configuration is missing.' };
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.replace(/\D/g, '');
    if (!/^\d{6}$/.test(cleanToken)) {
      return { success: false, message: '৬ সংখ্যার সঠিক কোডটি লিখুন।' };
    }
    const { error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'recovery'
    });
    if (error) {
      console.error('Password recovery code verification failed:', error);
      return { success: false, message: 'কোডটি ভুল অথবা মেয়াদ শেষ হয়েছে। নতুন কোড নিন।' };
    }
    return { success: true, message: 'কোড যাচাই সফল হয়েছে।' };
  },

  updatePassword: async (newPass: string) => {
    if (!isConfigured()) return { success: false, message: 'Supabase configuration is missing.' };
    if (newPass.length < 8) return { success: false, message: 'নতুন পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে।' };
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) {
      console.error('Password update failed:', error);
      return { success: false, message: 'নতুন পাসওয়ার্ড সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।' };
    }
    return { success: true, message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে।' };
  }
};