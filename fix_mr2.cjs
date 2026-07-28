const fs = require('fs');
let code = fs.readFileSync('/app/applet/components/MonthlyReports.tsx', 'utf8');

const regex = /<div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-in fade-in slide-in-from-left-8 duration-700 ease-out">[\s\S]*?<div className="bg-white dark:bg-slate-900 rounded-\[1\.5rem\]/;

const replacement = `<div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-in fade-in slide-in-from-left-8 duration-700 ease-out">
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
      </div>
            
      <div className="bg-white dark:bg-slate-900 rounded-[1.5rem]`;

code = code.replace(regex, replacement);

fs.writeFileSync('/app/applet/components/MonthlyReports.tsx', code);
console.log('Fixed MR2');
