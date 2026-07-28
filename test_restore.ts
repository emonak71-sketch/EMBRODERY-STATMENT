import { dbService } from './services/supabaseService';

async function test() {
  try {
    const party = await dbService.updateParty('53379945-3d91-4c05-b156-789356e12106', { is_deleted: true });
    console.log("Deleted:", party);
    const restored = await dbService.updateParty('53379945-3d91-4c05-b156-789356e12106', { is_deleted: false });
    console.log("Restored:", restored);
  } catch(e) {
    console.error(e);
  }
}
test();
