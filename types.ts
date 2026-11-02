export interface User {
  id: string;
  email: string;
  business_name: string;
}

export interface Party {
  id: string;
  name: string;
  phone: string;
  is_deleted?: boolean;
  created_at?: string;
  user_id?: string;
}

export interface Transaction {
  id: string;
  party_id: string;
  date: string;
  bill_no: string;
  details: string;
  pcs: number;
  rate: number;
  credit: number;
  payment: number;
  created_at?: string;
  user_id?: string;
  running_balance?: number;
}

export type TabType =
  | 'dashboard'
  | 'parties'
  | 'ledger'
  | 'settings'
  | 'monthly_reports'
  | 'monthly_collections'
  | 'sales'
  | 'expenses';
