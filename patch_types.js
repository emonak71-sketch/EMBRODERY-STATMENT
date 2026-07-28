const fs = require('fs');
let code = fs.readFileSync('types.ts', 'utf8');

code = code.replace("export type TabType = 'dashboard' | 'ledger' | 'inventory' | 'sales' | 'expenses' | 'parties' | 'settings';", "export type TabType = 'dashboard' | 'ledger' | 'parties' | 'settings';");

// Remove Product, Expense, Sale interfaces
code = code.replace(/export interface Product \{[\s\S]*?\}/g, '');
code = code.replace(/export interface Expense \{[\s\S]*?\}/g, '');
code = code.replace(/export interface Sale \{[\s\S]*?\}/g, '');

fs.writeFileSync('types.ts', code);
