export type TabType =
  | 'dashboard'
  | 'parties'
  | 'job_orders'
  | 'production'
  | 'ledger'
  | 'monthly_reports'
  | 'monthly_collections'
  | 'settings'
  | 'sales'
  | 'expenses';

export interface User {
  id: string;
  email: string;
  business_name: string;
}

export interface Party {
  id: string;
  name: string;
  phone?: string | null;
  created_at?: string;
  is_deleted?: boolean;
  user_id?: string;
}

export interface Transaction {
  id: string;
  party_id: string;
  date: string;
  bill_no: string;
  details?: string | null;
  pcs?: number | null;
  rate?: number | null;
  credit: number;
  payment: number;
  created_at?: string;
  user_id?: string;
  running_balance?: number;
}
