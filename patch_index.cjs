const fs = require('fs');
let code = fs.readFileSync('/app/applet/index.tsx', 'utf8');

if (!code.includes('LanguageProvider')) {
  code = code.replace(/import App from '\.\/App';/, "import App from './App';\nimport { LanguageProvider } from './contexts/LanguageContext';");
  code = code.replace(/<App \/>/, "<LanguageProvider><App /></LanguageProvider>");
  fs.writeFileSync('/app/applet/index.tsx', code);
  console.log('Fixed index.tsx');
}
