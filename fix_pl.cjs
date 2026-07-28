const fs = require('fs');
let code = fs.readFileSync('/app/applet/components/PartiesList.tsx', 'utf8');

code = code.replace(/<div className="flex items-center gap-4">\s*<button\s*onClick=\{\(\) => setActiveTab\('dashboard'\)\}\s*className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"\s*>\s*<ArrowLeft className="w-5 h-5" \/>\s*<\/button>\s*<div>\s*<h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">\s*All Parties\s*<\/h1>\s*<\/div>/, `<div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
            All Parties
          </h1>
        </div>
      </div>`);

fs.writeFileSync('/app/applet/components/PartiesList.tsx', code);
console.log('Fixed PL');
