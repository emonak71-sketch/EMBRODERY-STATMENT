const fs = require('fs');

function replaceFile(path, replacer) {
  let content = fs.readFileSync(path, 'utf8');
  let newContent = replacer(content);
  if (content !== newContent) {
    fs.writeFileSync(path, newContent);
    console.log(`Updated ${path}`);
  }
}

// 5. Ledger.tsx
replaceFile('/app/applet/components/Ledger.tsx', (code) => {
  if (!code.includes('useLanguage')) {
    code = code.replace(/import \{ Party, Transaction, User \} from '\.\.\/types';/, "import { Party, Transaction, User } from '../types';\nimport { useLanguage } from '../contexts/LanguageContext';");
  }
  
  if (!code.includes('const { t } = useLanguage();')) {
    code = code.replace(/const Ledger: React\.FC<LedgerProps> = \(\{[\s\S]*?\}\) => \{/, (match) => {
      return match + "\n  const { t } = useLanguage();";
    });
  }

  // Add setActiveTab prop if missing
  if (!code.includes('setActiveTab?: (tab: string) => void;')) {
    code = code.replace(/interface LedgerProps \{/, "interface LedgerProps {\n  setActiveTab?: (tab: string) => void;");
    code = code.replace(/const Ledger: React\.FC<LedgerProps> = \(\{[\s\S]*?\}\) => \{/, (match) => {
      return match.replace(/onSendSMS/, "onSendSMS, setActiveTab");
    });
  }

  // Add Back Button
  if (!code.includes('ArrowLeft')) {
    code = code.replace(/import \{ Plus, Minus, Search, Calendar, FileText, Send, X, Printer, Phone, MapPin, Save, MoreVertical, Edit2, Trash2, Shield \} from 'lucide-react';/, "import { Plus, Minus, Search, Calendar, FileText, Send, X, Printer, Phone, MapPin, Save, MoreVertical, Edit2, Trash2, Shield, ArrowLeft } from 'lucide-react';");
  }
  if (!code.includes('setActiveTab(\'parties\')')) {
    code = code.replace(/<div className="flex justify-between items-center mb-8">/, `
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              {setActiveTab && (
                <button 
                  onClick={() => setActiveTab('parties')}
                  className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300 no-print"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
`);
  }

  // Translate Ledger
  code = code.replace(/>Due Balance</g, ">{t('due_balance')}<");
  code = code.replace(/>Date</g, ">{t('date')}<");
  code = code.replace(/>Memo No</g, ">{t('memo_no')}<");
  code = code.replace(/>Details</g, ">{t('details')}<");
  code = code.replace(/>Qty \/ Rate</g, ">{t('qty_rate')}<");
  code = code.replace(/>Credit</g, ">{t('credit')}<");
  code = code.replace(/>Payment</g, ">{t('payment')}<");
  code = code.replace(/>Balance</g, ">{t('balance')}<");
  code = code.replace(/>Add Transaction</g, ">{t('add_transaction')}<");
  code = code.replace(/>Add Memo</g, ">{t('add_memo')}<");
  code = code.replace(/>Add Payment</g, ">{t('add_payment')}<");
  code = code.replace(/>Type</g, ">{t('type')}<");
  code = code.replace(/>Cancel</g, ">{t('cancel')}<");
  code = code.replace(/>Save Changes</g, ">{t('save_changes')}<");
  code = code.replace(/>Saving\.\.\.</g, ">{t('saving')}<");
  code = code.replace(/>Delete</g, ">{t('delete')}<");
  code = code.replace(/>Edit Party</g, ">{t('edit_party')}<");
  code = code.replace(/>Delete Party</g, ">{t('delete_party')}<");
  code = code.replace(/>Send SMS</g, ">{t('send_sms')}<");
  code = code.replace(/>Party Ledger</g, ">{t('party_ledger')}<");
  code = code.replace(/>Memo</g, ">{t('memo')}<");
  code = code.replace(/>Action</g, ">{t('action')}<");
  code = code.replace(/>No transactions found\.</g, ">{t('no_transactions')}<");
  
  return code;
});

// 6. Settings.tsx
replaceFile('/app/applet/components/Settings.tsx', (code) => {
  if (!code.includes('useLanguage')) {
    code = code.replace(/import \{ Party \} from '\.\.\/types';/, "import { Party } from '../types';\nimport { useLanguage } from '../contexts/LanguageContext';");
  }
  
  if (!code.includes('const { t } = useLanguage();')) {
    code = code.replace(/const Settings: React\.FC<SettingsProps> = \(\{[\s\S]*?\}\) => \{/, (match) => {
      return match + "\n  const { t } = useLanguage();";
    });
  }

  // Add Back Button
  if (!code.includes('ArrowLeft')) {
    code = code.replace(/import \{ Search, RefreshCw, AlertTriangle, Shield \} from 'lucide-react';/, "import { Search, RefreshCw, AlertTriangle, Shield, ArrowLeft } from 'lucide-react';");
  }
  
  if (!code.includes('setActiveTab?: (tab: string) => void;')) {
    code = code.replace(/interface SettingsProps \{/, "interface SettingsProps {\n  setActiveTab?: (tab: string) => void;");
    code = code.replace(/const Settings: React\.FC<SettingsProps> = \(\{[\s\S]*?\}\) => \{/, (match) => {
      return match.replace(/onPermanentDeleteParty/, "onPermanentDeleteParty, setActiveTab");
    });
  }
  
  if (!code.includes('setActiveTab(\'dashboard\')')) {
    code = code.replace(/<div className="flex justify-between items-center mb-8">/, `
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          {setActiveTab && (
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
`);
  }

  code = code.replace(/>Settings</g, ">{t('settings')}<");
  code = code.replace(/>Permanently Delete</g, ">{t('permanently_delete')}<");
  code = code.replace(/>Restore</g, ">{t('restore')}<");
  code = code.replace(/>Cancel</g, ">{t('cancel')}<");

  return code;
});

// 7. App.tsx
replaceFile('/app/applet/App.tsx', (code) => {
  // Update Ledger usage
  code = code.replace(/<Ledger \n             parties=\{parties\}/, `<Ledger \n             setActiveTab={setActiveTab}\n             parties={parties}`);
  
  // Update MonthlyReports usage
  code = code.replace(/<MonthlyReports transactions=\{transactions\} parties=\{parties\} \/>/, `<MonthlyReports setActiveTab={setActiveTab} transactions={transactions} parties={parties} />`);

  // Update Settings usage
  code = code.replace(/<Settings \n            deletedParties/, `<Settings \n            setActiveTab={setActiveTab}\n            deletedParties`);

  return code;
});

console.log('Update components part 2 done');
