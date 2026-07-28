const fs = require('fs');
let code = fs.readFileSync('/app/applet/types.ts', 'utf8');

code = code.replace(/export type TabType = 'dashboard' \| 'ledger' \| 'parties' \| 'settings';/, "export type TabType = 'dashboard' | 'ledger' | 'parties' | 'settings' | 'monthly_reports';");

fs.writeFileSync('/app/applet/types.ts', code);
console.log('Fixed types.ts');
