import { createClient } from '@supabase/supabase-js';

// Use import.meta.env for Vite projects on Vercel
// Added type assertion to any to fix TypeScript errors: Property 'env' does not exist on type 'ImportMeta'
export const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://utyhcyjdvzezvagrmbxg.supabase.co';
export const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0eWhjeWpkdnplenZhZ3JtYnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMTU3OTIsImV4cCI6MjEwMDc5MTc5Mn0.CPvz_UasSTkWI7cpbOOBBQiR0Ja-VmtL7XHOoVik7IM';

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.warn('Supabase URL is not configured. Please check your environment variables.');
}
// Keep Owner and Customer web/PWA sessions separate even though they share one Supabase project.
const isOwnerPortal = typeof window !== 'undefined' && window.location.pathname.endsWith('/owner.html');
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: isOwnerPortal ? 'embroidery-statement-owner-auth' : 'embroidery-statement-customer-auth',
  },
});
