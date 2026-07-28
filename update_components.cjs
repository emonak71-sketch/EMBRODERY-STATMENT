const fs = require('fs');

function replaceFile(path, replacer) {
  let content = fs.readFileSync(path, 'utf8');
  let newContent = replacer(content);
  if (content !== newContent) {
    fs.writeFileSync(path, newContent);
    console.log(`Updated ${path}`);
  }
}

// 1. Sidebar.tsx
replaceFile('/app/applet/components/Sidebar.tsx', (code) => {
  if (!code.includes('useLanguage')) {
    code = code.replace(/import \{ Party, TabType \} from '\.\.\/types';/, "import { Party, TabType } from '../types';\nimport { useLanguage } from '../contexts/LanguageContext';");
  }
  
  if (!code.includes('const { t, language, setLanguage } = useLanguage();')) {
    code = code.replace(/const Sidebar: React\.FC<SidebarProps> = \(\{[\s\S]*?\}\) => \{/, (match) => {
      return match + "\n  const { t, language, setLanguage } = useLanguage();";
    });
  }
  
  // Update nav labels
  code = code.replace(/label: 'Dashboard'/g, "label: t('dashboard')");
  code = code.replace(/label: 'Ledger'/g, "label: t('ledger')");
  code = code.replace(/label: 'Parties'/g, "label: t('parties')");
  code = code.replace(/label: 'Settings'/g, "label: t('settings')");
  
  // Replace direct strings
  code = code.replace(/>Search parties\.\.\.</g, ">{t('search_parties')}<");
  code = code.replace(/>All Parties</g, ">{t('all_parties')}<");
  code = code.replace(/>Add New Party</g, ">{t('add_new_party')}<");
  code = code.replace(/placeholder="Party Name"/g, "placeholder={t('party_name')}");
  code = code.replace(/placeholder="Phone No"/g, "placeholder={t('phone_no')}");
  code = code.replace(/>\{isSubmitting \? 'Adding\.\.\.' : 'Add Party'\}</g, ">{isSubmitting ? t('adding') : t('add_party')}<");
  code = code.replace(/>Due Balance</g, ">{t('due_balance')}<");
  code = code.replace(/>No parties found\.</g, ">{t('no_parties_found')}<");
  code = code.replace(/>Edit Party</g, ">{t('edit_party')}<");
  code = code.replace(/>Delete Party</g, ">{t('delete_party')}<");
  code = code.replace(/>Cancel</g, ">{t('cancel')}<");
  code = code.replace(/>Delete</g, ">{t('delete')}<");
  code = code.replace(/>Save Changes</g, ">{t('save_changes')}<");
  code = code.replace(/>Logout</g, ">{t('logout')}<");
  code = code.replace(/>Theme</g, ">{t('theme')}<");
  code = code.replace(/>Light</g, ">{t('light')}<");
  code = code.replace(/>Dark</g, ">{t('dark')}<");

  // Add Language Toggle
  if (!code.includes('Language Toggle')) {
    const toggleCode = `
            {/* Language Toggle */}
            <div className="mb-4">
              <p className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('language')}</p>
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                <button
                  onClick={() => setLanguage('en')}
                  className={\`flex-1 py-2 rounded-lg text-xs font-bold transition-all \${language === 'en' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage('bn')}
                  className={\`flex-1 py-2 rounded-lg text-xs font-bold transition-all \${language === 'bn' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
                >
                  বাংলা
                </button>
              </div>
            </div>
`;
    code = code.replace(/<div className="mb-4">\s*<p className="px-4 text-\[10px\] font-black uppercase tracking-widest text-slate-400 mb-2">Theme<\/p>/, (match) => {
      return toggleCode + "\n            " + match;
    });
  }

  return code;
});

// 2. Dashboard.tsx
replaceFile('/app/applet/components/Dashboard.tsx', (code) => {
  if (!code.includes('useLanguage')) {
    code = code.replace(/import \{ ChevronRight \} from 'lucide-react';/, "import { ChevronRight } from 'lucide-react';\nimport { useLanguage } from '../contexts/LanguageContext';");
  }
  
  if (!code.includes('const { t } = useLanguage();')) {
    code = code.replace(/const Dashboard: React\.FC<[\s\S]*?> = \(\{[\s\S]*?\}\) => \{/, (match) => {
      return match + "\n  const { t } = useLanguage();";
    });
  }
  
  code = code.replace(/title: 'Total Outstanding'/g, "title: t('total_outstanding')");
  code = code.replace(/title: 'Total Collected'/g, "title: t('total_collected')");
  code = code.replace(/title: 'Total Credit'/g, "title: t('total_credit')");
  code = code.replace(/title: 'Monthly Work'/g, "title: t('monthly_work')");
  code = code.replace(/title: 'Total Parties'/g, "title: t('total_parties')");
  
  code = code.replace(/>Overview</g, ">{t('overview')}<");
  code = code.replace(/>Recent Activity</g, ">{t('recent_activity')}<");
  code = code.replace(/>No recent activity\.</g, ">{t('no_recent_activity')}<");

  return code;
});

// 3. PartiesList.tsx
replaceFile('/app/applet/components/PartiesList.tsx', (code) => {
  if (!code.includes('useLanguage')) {
    code = code.replace(/import \{ Party, Transaction, TabType \} from '\.\.\/types';/, "import { Party, Transaction, TabType } from '../types';\nimport { useLanguage } from '../contexts/LanguageContext';");
  }
  if (!code.includes('const { t } = useLanguage();')) {
    code = code.replace(/const PartiesList: React\.FC<PartiesListProps> = \(\{[\s\S]*?\}\) => \{/, (match) => {
      return match + "\n  const { t } = useLanguage();";
    });
  }
  
  // Add Back Button
  if (!code.includes('ArrowLeft')) {
    code = code.replace(/import \{ ChevronRight, Users, Plus, X \} from 'lucide-react';/, "import { ChevronRight, Users, Plus, X, ArrowLeft } from 'lucide-react';");
  }
  if (!code.includes('setActiveTab(\'dashboard\')')) {
    code = code.replace(/<div>\s*<h1 className="text-3xl font-black/, `
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black`);
  }

  code = code.replace(/>All Parties</g, ">{t('all_parties')}<");
  code = code.replace(/>Add Party</g, ">{t('add_party')}<");
  code = code.replace(/>No parties found\.</g, ">{t('no_parties_found')}<");
  code = code.replace(/>Due Balance</g, ">{t('due_balance')}<");
  code = code.replace(/>Add New Party</g, ">{t('add_new_party')}<");
  code = code.replace(/placeholder="Party Name"/g, "placeholder={t('party_name')}");
  code = code.replace(/placeholder="Phone No"/g, "placeholder={t('phone_no')}");
  code = code.replace(/>\{isSubmitting \? 'Adding\.\.\.' : 'Add Party'\}</g, ">{isSubmitting ? t('adding') : t('add_party')}<");

  return code;
});

// 4. MonthlyReports.tsx
replaceFile('/app/applet/components/MonthlyReports.tsx', (code) => {
  if (!code.includes('useLanguage')) {
    code = code.replace(/import \{ Transaction, Party \} from '\.\.\/types';/, "import { Transaction, Party } from '../types';\nimport { useLanguage } from '../contexts/LanguageContext';");
  }
  if (!code.includes('const { t } = useLanguage();')) {
    code = code.replace(/const MonthlyReports: React\.FC<MonthlyReportsProps> = \(\{[\s\S]*?\}\) => \{/, (match) => {
      return match + "\n  const { t } = useLanguage();";
    });
  }
  
  if (!code.includes('setActiveTab')) {
    code = code.replace(/interface MonthlyReportsProps \{/, "interface MonthlyReportsProps {\n  setActiveTab: (t: string) => void;");
    code = code.replace(/const MonthlyReports: React\.FC<MonthlyReportsProps> = \(\{ transactions, parties \}\) => \{/, "const MonthlyReports: React.FC<MonthlyReportsProps> = ({ transactions, parties, setActiveTab }) => {");
  }
  
  // Add Back Button to main view
  if (!code.includes('onClick={() => setActiveTab(\'dashboard\')}')) {
    code = code.replace(/<div>\s*<h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">\s*Monthly Work/, `
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
              {t('monthly_work')}
            </h1>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">
              {t('month_by_month')}
            </p>
          </div>
        </div>
`);
    // Remove the old h1 block
    code = code.replace(/<div>\s*<h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">\s*Monthly Work\s*<\/h1>\s*<p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">\s*Month by Month Breakdown\s*<\/p>\s*<\/div>/, "");
  }

  code = code.replace(/>Date</g, ">{t('date')}<");
  code = code.replace(/>Memo No</g, ">{t('memo_no')}<");
  code = code.replace(/>Party Name</g, ">{t('party_name')}<");
  code = code.replace(/>Details</g, ">{t('details')}<");
  code = code.replace(/>Qty \/ Rate</g, ">{t('qty_rate')}<");
  code = code.replace(/>Amount</g, ">{t('amount')}<");
  code = code.replace(/>Total Work</g, ">{t('total_work')}<");
  code = code.replace(/>Memos</g, ">{t('memos')}<");
  code = code.replace(/>No work records found\.</g, ">{t('no_work_records')}<");
  code = code.replace(/>Total Work:/g, ">{t('total_work')}:");

  return code;
});

console.log('Update components part 1 done');
