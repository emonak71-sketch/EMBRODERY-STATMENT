const fs = require('fs');
let code = fs.readFileSync('/app/applet/components/Settings.tsx', 'utf8');

if (!code.includes('ArrowLeft')) {
  code = code.replace(/import \{ Settings as SettingsIcon, Save, Mail, Building, Loader2, CheckCircle2 \} from 'lucide-react';/, "import { Settings as SettingsIcon, Save, Mail, Building, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';");
}

code = code.replace(/const Settings: React\.FC<SettingsProps> = \(\{ user, onUpdateProfile \}\) => \{/, "const Settings: React.FC<SettingsProps> = ({ user, onUpdateProfile, setActiveTab }) => {");

code = code.replace(/<div className="flex items-center gap-4 mb-10">/, `<div className="flex items-center gap-4 mb-10">
        {setActiveTab && (
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="p-3 bg-slate-100 dark:bg-slate-800 rounded-[1rem] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}`);

fs.writeFileSync('/app/applet/components/Settings.tsx', code);
console.log('Fixed settings');
