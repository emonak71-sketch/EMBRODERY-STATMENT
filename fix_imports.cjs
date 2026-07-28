const fs = require('fs');
let settingsCode = fs.readFileSync('/app/applet/components/Settings.tsx', 'utf8');
settingsCode = settingsCode.replace(/import \{ User \} from '\.\.\/types';/, "import { User } from '../types';\nimport { useLanguage } from '../contexts/LanguageContext';");
fs.writeFileSync('/app/applet/components/Settings.tsx', settingsCode);

let ledgerCode = fs.readFileSync('/app/applet/components/Ledger.tsx', 'utf8');
ledgerCode = ledgerCode.replace(/import \{ Party, Transaction, User as UserType \} from '\.\.\/types';/, "import { Party, Transaction, User as UserType } from '../types';\nimport { useLanguage } from '../contexts/LanguageContext';");
fs.writeFileSync('/app/applet/components/Ledger.tsx', ledgerCode);
console.log('Fixed imports');
