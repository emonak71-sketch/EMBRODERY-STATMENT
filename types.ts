export interface User {
  id: string;
  email: string;
  business_name: string;
}

export interface Party {
  id: string;
  name: string;
  phone: string;
  address?: string;
  is_deleted?: boolean; // Added for Recycle Bin
  created_at: string;
}

export interface Transaction {
  id: string;
  party_id: string;
  date: string;
  bill_no: string;
  details: string; // Model or Item Details
  pcs: number;    // Quantity/Pis
  rate: number;   // Rate per piece
  credit: number; // Calculated as pcs * rate
  payment: number;// Cash received
  created_at: string;
}







export interface LedgerEntry extends Transaction {
  running_balance: number;
}

export type TabType = 'dashboard' | 'ledger' | 'parties' | 'settings';