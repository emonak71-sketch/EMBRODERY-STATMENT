const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const statsInit = `  const [stats, setStats] = useState({
    totalCredit: 0,
    totalCollected: 0,
    totalOutstanding: 0
  });`;
const statsInitRepl = `  const [stats, setStats] = useState({
    totalCredit: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    monthlyWork: 0
  });`;
code = code.replace(statsInit, statsInitRepl);

const statsCalc = `      const totalCredit = activeTransactions.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
      const totalCollected = activeTransactions.reduce((sum, item) => sum + (Number(item.payment) || 0), 0);

      setStats({
        totalCredit,
        totalCollected,
        totalOutstanding: totalCredit - totalCollected
      });`;
const statsCalcRepl = `      const totalCredit = activeTransactions.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
      const totalCollected = activeTransactions.reduce((sum, item) => sum + (Number(item.payment) || 0), 0);
      
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      const monthlyWork = activeTransactions.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).reduce((sum, item) => sum + (Number(item.credit) || 0), 0);

      setStats({
        totalCredit,
        totalCollected,
        totalOutstanding: totalCredit - totalCollected,
        monthlyWork
      });`;
code = code.replace(statsCalc, statsCalcRepl);

const statsReset = `        setStats({
          totalCredit: 0,
          totalCollected: 0,
          totalOutstanding: 0
        });`;
const statsResetRepl = `        setStats({
          totalCredit: 0,
          totalCollected: 0,
          totalOutstanding: 0,
          monthlyWork: 0
        });`;
code = code.replace(statsReset, statsResetRepl);

fs.writeFileSync('App.tsx', code);
