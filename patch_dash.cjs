const fs = require('fs');
let code = fs.readFileSync('/app/applet/components/Dashboard.tsx', 'utf8');

code = code.replace(
  /color: 'bg-amber-50 dark:bg-amber-900\/10',\n      isDynamic: false\n    \}/,
  `color: 'bg-amber-50 dark:bg-amber-900/10',
      isDynamic: false,
      onClick: () => { if (setActiveTab) setActiveTab('monthly_reports'); }
    }`
);

fs.writeFileSync('/app/applet/components/Dashboard.tsx', code);
console.log('Fixed Dashboard.tsx');
