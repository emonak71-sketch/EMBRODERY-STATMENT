
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
        msg = 'আপনার ইমেইল কনফার্ম করা হয়নি। জিমেইল ইনবক্স চেক করে কনফার্মেশন লিঙ্কে ক্লিক করুন।';
      }
      return { success: false, message: msg };
    }
    return { success: true, user: { id: data.user.id, email: data.user.email!, business_name: data.user.user_metadata?.business_name || 'EMBRODERY STATEMENT' } };
  },
  
  signup: async (email: string, pass: string, businessName: string) => {
    if (!isConfigured()) return { success: false, message: 'Supabase ব্যাকএন্ড কনফিগার করা নেই।' };
    const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password: pass, options: { data: { business_name: businessName } } });
    if (error) {
      let msg = error.message;
      if (error.message.includes('User already registered') || error.message.includes('already exists')) {
        msg = 'এই ইমেইল দিয়ে ইতোমধ্যে একটি একাউন্ট খোলা আছে। লগ-ইন করার চেষ্টা করুন।';
      } else if (error.message.includes('Password should be at least')) {
        msg = 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।';
      }
      return { success: false, message: msg };
    }
    return { success: true, user: { id: data.user!.id, email: data.user!.email!, business_name: businessName }, message: data.session ? null : 'অ্যাকাউন্ট তৈরি সফল হয়েছে! দয়া করে লগ-ইন করুন।' };
  },

  updateProfile: async (email: string, businessName: string) => {
    if (!isConfigured()) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.updateUser({ email, data: { business_name: businessName } });
    if (error) throw error;
    return { id: data.user.id, email: data.user.email!, business_name: data.user.user_metadata?.business_name || businessName };
  },

  logout: async () => { if (isConfigured()) await supabase.auth.signOut(); },

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
  
  resetPassword: async (email: string) => {
    if (!isConfigured()) return { success: false, message: 'Supabase configuration is missing.' };
    
    // Get the current URL without any query params or hashes
    const redirectUrl = window.location.href.split('#')[0].split('?')[0];
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'পাসওয়ার্ড রিসেট লিঙ্ক আপনার ইমেইলে পাঠানো হয়েছে।' };
  },

  updatePassword: async (newPass: string) => {
    if (!isConfigured()) return { success: false, message: 'Supabase configuration is missing.' };
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Password updated successfully.' };
  }
};
