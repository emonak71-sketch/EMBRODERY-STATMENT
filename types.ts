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

export interface Product {
  id: string;
  name: string;
  sku: string;
  buying_price: number;
  selling_price: number;
  stock: number;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
}

export interface Sale {
  id: string;
  date: string;
  customer_name: string;
  total_amount: number;
  paid_amount: number;
}

export interface LedgerEntry extends Transaction {
  running_balance: number;
}

export type TabType = 'dashboard' | 'ledger' | 'inventory' | 'sales' | 'expenses' | 'parties' | 'settings';