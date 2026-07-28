import { dbService } from './services/supabaseService.js';
import { supabase } from './services/supabaseClient.js';

async function test() {
  const party = await dbService.updateParty('53379945-3d91-4c05-b156-789356e12106', { is_deleted: false });
  console.log("Restored:", party);
}
test().catch(console.error);
