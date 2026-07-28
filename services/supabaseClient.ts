import { createClient } from '@supabase/supabase-js';

// Use import.meta.env for Vite projects on Vercel
// Added type assertion to any to fix TypeScript errors: Property 'env' does not exist on type 'ImportMeta'
export const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://otldlfkctskfrapnuvig.supabase.co';
export const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90bGRsZmtjdHNrZnJhcG51dmlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MTE0NzcsImV4cCI6MjA4NTI4NzQ3N30.qFNjgRFc0e9unsSmmnWF75MyOq2kUZLQaYrU_jZ60YQ';

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.warn('Supabase URL is not configured. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);