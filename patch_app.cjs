const fs = require('fs');
let code = fs.readFileSync('/app/applet/App.tsx', 'utf8');

// Add import
const importRegex = /import Settings from '\.\/components\/Settings';/;
code = code.replace(importRegex, "import Settings from './components/Settings';\nimport PartiesList from './components/PartiesList';");

// Add PartiesList to main block
const mainRegex = /\{activeTab === 'dashboard' && <Dashboard stats=\{stats\} user=\{user\} parties=\{parties\} transactions=\{transactions\} setActiveTab=\{setActiveTab\} setSelectedParty=\{setSelectedParty\} \/>\}/;
code = code.replace(mainRegex, `{activeTab === 'dashboard' && <Dashboard stats={stats} user={user} parties={parties} transactions={transactions} setActiveTab={setActiveTab} setSelectedParty={setSelectedParty} />}\n        {activeTab === 'parties' && <PartiesList parties={parties} transactions={transactions} setActiveTab={setActiveTab} setSelectedParty={setSelectedParty} />}`);

fs.writeFileSync('/app/applet/App.tsx', code);
console.log('Fixed App.tsx');
