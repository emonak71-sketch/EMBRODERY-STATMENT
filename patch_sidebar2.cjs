const fs = require('fs');
let code = fs.readFileSync('/app/applet/components/Sidebar.tsx', 'utf8');

code = code.replace(
  /Search, Sun, Moon/,
  `Search, Users, Sun, Moon`
);

code = code.replace(
  /\{ id: 'parties', label: 'Parties', icon: <Search className="w-5 h-5" \/> \},/,
  `{ id: 'parties', label: 'Parties', icon: <Users className="w-5 h-5" /> },`
);

fs.writeFileSync('/app/applet/components/Sidebar.tsx', code);
console.log('Sidebar Fixed');
