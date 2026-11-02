import { supabase, supabaseUrl } from './supabaseClient';
import { Party, Transaction } from '../types';

const isConfigured = () => Boolean(supabaseUrl) && !supabaseUrl.includes('placeholder-project.supabase.co');

const getCurrentUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('আপনার সেশন শেষ হয়েছে। আবার লগ-ইন করুন।');
  return data.user.id;
};

const handleDbError = (error: any, context: string) => {
  console.error(`Database Error [${context}]:`, error);
  const message = String(error?.message || 'Unknown database error');
  if (message.toLowerCase().includes('column') && message.toLowerCase().includes('does not exist')) {
    return new Error(`Database schema is missing a required column while ${context}. Run the v10 Supabase migration from supabase/v10-security-migration.sql.`);
  }
  return new Error(`${context}: ${message}`);
};

export const dbService = {
  login: async (email: string, pass: string) => {
    if (!isConfigured()) return { success: false, message: 'Supabase ব্যাকএন্ড কনফিগার করা নেই।' };
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pass });
    if (error) {
      let message = error.message;
      if (error.message.includes('Invalid login credentials')) message = 'ইমেইল বা পাসওয়ার্ড ভুল হয়েছে। সঠিক তথ্য দিয়ে চেষ্টা করুন।';
      else if (error.message.includes('Email not confirmed')) message = 'আপনার ইমেইল কনফার্ম করা হয়নি। ইনবক্সে পাঠানো কনফার্মেশন মেসেজ দেখুন।';
      return { success: false, message };
    }
    return { success: true, user: { id: data.user.id, email: data.user.email || '', business_name: data.user.user_metadata?.business_name || 'EMBROIDERY STATEMENT' } };
  },

  signup: async (email: string, pass: string, businessName: string) => {
    if (!isConfigured()) return { success: false, message: 'Supabase ব্যাকএন্ড কনফিগার করা নেই।' };
    if (pass.length < 8) return { success: false, message: 'পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে।' };
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: pass,
      options: { data: { business_name: businessName.trim() } }
    });
    if (error) {
      let message = error.message;
      if (error.message.includes('User already registered') || error.message.includes('already exists')) {
        message = 'এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট খোলা আছে। লগ-ইন করার চেষ্টা করুন।';
      }
      return { success: false, message };
    }
    return {
      success: true,
      user: data.user ? { id: data.user.id, email: data.user.email || '', business_name: businessName } : undefined,
      message: data.session ? 'অ্যাকাউন্ট তৈরি হয়েছে।' : 'অ্যাকাউন্ট তৈরি হয়েছে। ইমেইল কনফার্ম করে তারপর লগ-ইন করুন।'
    };
  },

  updateProfile: async (email: string, businessName: string) => {
    if (!isConfigured()) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.updateUser({ email: email.trim().toLowerCase(), data: { business_name: businessName.trim() } });
    if (error) throw error;
    if (!data.user) throw new Error('Profile update did not return a user.');
    return { id: data.user.id, email: data.user.email || email, business_name: data.user.user_metadata?.business_name || businessName };
  },

  logout: async () => {
    if (isConfigured()) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
  },

  getInitialData: async () => {
    if (!isConfigured()) throw new Error('Supabase configuration is missing.');
    const userId = await getCurrentUserId();
    const [partiesResult, transactionsResult] = await Promise.all([
      supabase.from('Parties').select('*').eq('user_id', userId),
      supabase.from('Transactions').select('*').eq('user_id', userId).order('date', { ascending: true })
    ]);
    if (partiesResult.error) throw handleDbError(partiesResult.error, 'loading parties');
    if (transactionsResult.error) throw handleDbError(transactionsResult.error, 'loading transactions');
    return {
      parties: partiesResult.data || [],
      transactions: transactionsResult.data || [],
      products: [],
      expenses: [],
      sales: []
    };
  },

  addParty: async (party: Omit<Party, 'id' | 'created_at'>) => {
    const userId = await getCurrentUserId();
    const payload = { ...party, user_id: userId };
    const { data, error } = await supabase.from('Parties').insert([payload]).select();
    if (error) throw handleDbError(error, 'adding party');
    return data?.[0];
  },

  updateParty: async (id: string, updates: Partial<Party>) => {
    const userId = await getCurrentUserId();
    const safeUpdates = { ...updates, user_id: userId };
    const { data, error } = await supabase.from('Parties').update(safeUpdates).eq('id', id).eq('user_id', userId).select();
    if (error) throw handleDbError(error, 'updating party');
    if (!data?.length) throw new Error('কাস্টমারটি পাওয়া যায়নি অথবা আপনার অ্যাকাউন্টে পরিবর্তনের অনুমতি নেই।');
    return data[0];
  },

  deleteParty: async (id: string) => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('Parties').delete().eq('id', id).eq('user_id', userId).select('id');
    if (error) throw handleDbError(error, 'deleting party');
    if (!data?.length) throw new Error('কাস্টমারটি পাওয়া যায়নি অথবা মুছে ফেলার অনুমতি নেই।');
    return true;
  },

  addTransaction: async (transaction: Omit<Transaction, 'id' | 'created_at'>) => {
    const userId = await getCurrentUserId();
    const payload = {
      party_id: transaction.party_id,
      date: transaction.date,
      bill_no: transaction.bill_no,
      details: transaction.details || '',
      pcs: Number(transaction.pcs) || 0,
      rate: Number(transaction.rate) || 0,
      credit: Number(transaction.credit) || 0,
      payment: Number(transaction.payment) || 0,
      user_id: userId
    };
    const { data, error } = await supabase.from('Transactions').insert([payload]).select();
    if (error) throw handleDbError(error, 'adding transaction');
    return data?.[0];
  },

  updateTransaction: async (id: string, updates: Partial<Transaction>) => {
    const userId = await getCurrentUserId();
    const safeUpdates = { ...updates, user_id: userId };
    const { data, error } = await supabase.from('Transactions').update(safeUpdates).eq('id', id).eq('user_id', userId).select();
    if (error) throw handleDbError(error, 'updating transaction');
    if (!data?.length) throw new Error('লেনদেনটি পাওয়া যায়নি অথবা আপনার অ্যাকাউন্টে পরিবর্তনের অনুমতি নেই।');
    return data[0];
  },

  deleteTransaction: async (id: string) => {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase.from('Transactions').delete().eq('id', id).eq('user_id', userId).select('id');
    if (error) throw handleDbError(error, 'deleting transaction');
    if (!data?.length) throw new Error('লেনদেনটি পাওয়া যায়নি অথবা মুছে ফেলার অনুমতি নেই।');
    return true;
  },

  resetPassword: async (email: string) => {
    if (!isConfigured()) return { success: false, message: 'Supabase configuration is missing.' };
    const cleanEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
    if (error) {
      console.error('Password recovery email request failed:', error);
      return { success: false, message: 'ইমেইলে কোড পাঠানো যায়নি। ঠিকানা যাচাই করে আবার চেষ্টা করুন।' };
    }
    return { success: true, message: 'আপনার ইমেইলে ৬ সংখ্যার যাচাইকরণ কোড পাঠানো হয়েছে।' };
  },

  verifyResetCode: async (email: string, token: string) => {
    if (!isConfigured()) return { success: false, message: 'Supabase configuration is missing.' };
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.replace(/\D/g, '');
    if (!/^\d{6}$/.test(cleanToken)) return { success: false, message: '৬ সংখ্যার সঠিক কোডটি লিখুন।' };
    const { error } = await supabase.auth.verifyOtp({ email: cleanEmail, token: cleanToken, type: 'recovery' });
    if (error) {
      console.error('Password recovery code verification failed:', error);
      return { success: false, message: 'কোডটি ভুল অথবা মেয়াদ শেষ হয়েছে। নতুন কোড নিন।' };
    }
    return { success: true, message: 'কোড যাচাই সফল হয়েছে।' };
  },

  updatePassword: async (newPass: string) => {
    if (!isConfigured()) return { success: false, message: 'Supabase configuration is missing.' };
    if (newPass.length < 8) return { success: false, message: 'পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে।' };
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) {
      console.error('Password update failed:', error);
      return { success: false, message: 'নতুন পাসওয়ার্ড সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।' };
    }
    return { success: true, message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে।' };
  }
};
