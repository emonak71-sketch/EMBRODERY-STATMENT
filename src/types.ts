export type TransactionType = 'BAKI (+)' | 'PAYMENT (-)';

export type DeliveryStatus = 'Pending' | 'Dispatched' | 'Out for Delivery' | 'Delivered' | 'Returned' | 'Cancelled';

export interface StatusTimelineEntry {
  status: DeliveryStatus;
  timestamp: string;
  location?: string;
  note?: string;
  updated_by?: string;
}

export interface DeliveryRecord {
  id: string; // Delivery ID e.g. "DEL-1024"
  memo_no: string; // Associated Memo No e.g. "#MEMO-1024"
  party_name: string;
  mobile: string;
  address: string;
  courier_partner: string;
  tracking_code?: string;
  pcs: number;
  total_amount: number;
  current_status: DeliveryStatus;
  status_history: StatusTimelineEntry[];
  sms_draft: string;
  created_at: string;
  last_updated_at: string;
}

export interface DeliveryStatusJSONOutput {
  delivery_id: string;
  memo_no: string;
  customer_details: {
    party_name: string;
    mobile: string;
    delivery_address: string;
  };
  logistics: {
    courier_partner: string;
    tracking_code: string;
    pcs: number;
    total_amount: number;
  };
  status_info: {
    current_status: DeliveryStatus;
    last_updated: string;
    history: StatusTimelineEntry[];
  };
  sms_draft: string;
}

export interface TransactionEntry {
  id: string;
  party_name: string;
  mobile: string;
  memo_no: string;
  date: string; // DD/MM/YYYY
  pcs: number;
  rate: number;
  total_amount: number; // pcs * rate or flat payment
  transaction_type: TransactionType;
  previous_balance: number;
  updated_balance: number;
  sms_draft: string;
  item_description?: string;
  notes?: string;
  created_at?: string;
  delivery_id?: string;
}

export interface Party {
  id: string;
  name: string;
  mobile: string;
  address: string;
  business_type?: string;
  current_balance: number;
  credit_limit?: number;
  last_transaction_date: string;
}

export interface OverallSummary {
  total_receivable: number;
  total_weekly_collection: number;
  total_weekly_baki: number;
  total_parties: number;
  total_transactions: number;
  total_deliveries?: number;
  active_deliveries?: number;
}

export interface AIMemoParseResult {
  party_name: string;
  mobile: string;
  memo_no: string;
  date: string;
  pcs: number;
  rate: number;
  total_amount: number;
  transaction_type: TransactionType;
  item_description?: string;
  notes?: string;
  confidence?: number;
}

export interface DeveloperOutputJSON {
  party_name: string;
  mobile: string;
  memo_no: string;
  date: string;
  pcs: number;
  rate: number;
  total_amount: number;
  transaction_type: TransactionType;
  previous_balance: number;
  updated_balance: number;
  sms_draft: string;
}
