import { dbService } from './services/supabaseService';

async function test() {
  try {
    const res = await dbService.deleteParty('some-id');
    console.log(res);
  } catch(e) {
    console.log(e);
  }
}
test();
