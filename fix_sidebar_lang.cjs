const fs = require('fs');
let code = fs.readFileSync('/app/applet/components/Sidebar.tsx', 'utf8');

const regex = /<div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1">/;

const replacement = `<div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
            {/* Language Toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-2">
              <button
                onClick={() => setLanguage('en')}
                className={\`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all \${language === 'en' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('bn')}
                className={\`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all \${language === 'bn' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
              >
                বাংলা
              </button>
            </div>`;

code = code.replace(regex, replacement);

// Replace Dark Mode/Light Mode with translation
code = code.replace(/<span>\{isDarkMode \? 'Light Mode' : 'Dark Mode'\}<\/span>/, "<span>{isDarkMode ? t('light') : t('dark')}</span>");
code = code.replace(/<span>Sign Out<\/span>/, "<span>{t('logout')}</span>");

fs.writeFileSync('/app/applet/components/Sidebar.tsx', code);
console.log('Fixed sidebar language toggle');
