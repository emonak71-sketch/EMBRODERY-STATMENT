const fs = require('fs');
let code = fs.readFileSync('/app/applet/App.tsx', 'utf8');

const importRegex = /import Settings from '\.\/components\/Settings';/;
code = code.replace(importRegex, "import Settings from './components/Settings';\nimport MonthlyReports from './components/MonthlyReports';");

const mainRegex = /\{activeTab === 'settings' && \(/;
code = code.replace(mainRegex, `{activeTab === 'monthly_reports' && <MonthlyReports transactions={transactions} parties={parties} />}\n        {activeTab === 'settings' && (`);

fs.writeFileSync('/app/applet/App.tsx', code);
console.log('Fixed App.tsx');
