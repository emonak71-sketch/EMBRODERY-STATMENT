const fs = require('fs');
let code = fs.readFileSync('components/MonthlyReports.tsx', 'utf8');
code = code.replace(
  /const sortedParties = Object\.values\(monthDetails\.partyTotals\)\.sort\(\(a, b\) => b\.total - a\.total\);/,
  "const sortedParties = Object.values(monthDetails.partyTotals).sort((a: any, b: any) => b.total - a.total) as {name: string, total: number, memos: number, id: string}[];"
);
fs.writeFileSync('components/MonthlyReports.tsx', code);
