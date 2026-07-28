import { dbService } from './services/supabaseService';
import { supabase } from './services/supabaseClient';

async function test() {
  const { error } = await supabase.from('Parties').delete().eq('id', '53379945-3d91-4c05-b156-789356e12106');
  console.log("Delete error:", error);
}
test();
