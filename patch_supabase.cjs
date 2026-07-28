const fs = require('fs');
let code = fs.readFileSync('services/supabaseService.ts', 'utf8');

const targetStr = `  deleteTransaction: async (id: string) => {
    const { error } = await supabase.from('Transactions').delete().eq('id', id);
    if (error) throw handleDbError(error, 'deleting transaction');
    return true;
  },
  
  if (!isConfigured()) return { success: false, message: 'Supabase configuration is missing.' };`;

const replaceStr = `  deleteTransaction: async (id: string) => {
    const { error } = await supabase.from('Transactions').delete().eq('id', id);
    if (error) throw handleDbError(error, 'deleting transaction');
    return true;
  },
  
  resetPassword: async (email: string) => {
    if (!isConfigured()) return { success: false, message: 'Supabase configuration is missing.' };`;

if (code.includes('if (!isConfigured()) return { success: false, message: \'Supabase configuration is missing.\' };')) {
  code = code.replace(
    /  deleteTransaction: async \(id: string\) => {[\s\S]*?if \(!isConfigured\(\)\) return \{ success: false, message: 'Supabase configuration is missing\.' \};/,
    replaceStr
  );
  fs.writeFileSync('services/supabaseService.ts', code);
  console.log("Patched");
} else {
  console.log("Could not find string");
}
