import { Party, Transaction, User } from '../types';

const STORAGE_KEY = 'embrodery_statement_db';

interface DBState {
  user: User | null;
  parties: Party[];
  transactions: Transaction[];
}

const initialState: DBState = {
  user: null,
  parties: [
    { id: '1', name: 'Al-Madina Fabrics', phone: '01712345678', created_at: new Date().toISOString() },
    { id: '2', name: 'Sarker Embroidery', phone: '01888776655', created_at: new Date().toISOString() }
  ],
  transactions: [
    { id: 't1', party_id: '1', date: '2023-10-01', bill_no: 'B-101', details: 'Initial Work', pcs: 100, rate: 50, credit: 5000, payment: 0, created_at: new Date().toISOString() },
    { id: 't2', party_id: '1', date: '2023-10-05', bill_no: 'P-001', details: 'Cash Payment', pcs: 0, rate: 0, credit: 0, payment: 2000, created_at: new Date().toISOString() }
  ]
};

export const getDB = (): DBState => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : initialState;
};

export const saveDB = (state: DBState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const dbService = {
  login: async (email: string, pass: string) => {
    await new Promise(r => setTimeout(r, 500));
    const db = getDB();
    const user = { id: 'u1', email, business_name: 'EMBRODERY STATEMENT' };
    db.user = user;
    saveDB(db);
    return { success: true, user };
  },
  
  signup: async (email: string, pass: string, businessName: string) => {
    await new Promise(r => setTimeout(r, 800));
    const db = getDB();
    const user = { id: Math.random().toString(36), email, business_name: businessName };
    db.user = user;
    saveDB(db);
    return { success: true, user, message: 'Signup successful!' };
  },

  logout: () => {
    const db = getDB();
    db.user = null;
    saveDB(db);
  },

  addParty: async (party: Omit<Party, 'id' | 'created_at'>) => {
    const db = getDB();
    const newParty = { ...party, id: Math.random().toString(36), created_at: new Date().toISOString() };
    db.parties.push(newParty);
    saveDB(db);
    return newParty;
  },

  addTransaction: async (tx: Omit<Transaction, 'id' | 'created_at'>) => {
    const db = getDB();
    const newTx = { ...tx, id: Math.random().toString(36), created_at: new Date().toISOString() };
    db.transactions.push(newTx);
    saveDB(db);
    return newTx;
  },
};
