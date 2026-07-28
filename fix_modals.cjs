const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const toReplace = `         )}
      
      {txToDelete && (`;

const newCode = `         )}
      </div>
      
      {txToDelete && (`;

if (code.includes(toReplace)) {
    code = code.replace(toReplace, newCode);
    code = code.replace(/<\/div>\s*<\/div>\s*<\/div>\s*\);\s*};\s*export default App;/g, '</div>\n    </div>\n  );\n};\n\nexport default App;');
    fs.writeFileSync('App.tsx', code);
    console.log("Fixed!");
} else {
    console.log("Not found");
}
