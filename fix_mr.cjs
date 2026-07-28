const fs = require('fs');
let code = fs.readFileSync('/app/applet/components/MonthlyReports.tsx', 'utf8');

code = code.replace(/<\/div>\n        <\/div>\n          <\/h1>\n          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">\n            Month by Month Breakdown\n          <\/p>\n        <\/div>/, '</div>\n        </div>');

fs.writeFileSync('/app/applet/components/MonthlyReports.tsx', code);
console.log('Fixed MR');
