import { dbService } from './services/supabaseService';
import { supabase } from './services/supabaseClient';

async function test() {
  const party = await dbService.addParty({ name: 'Test FK', phone: '123' });
  await dbService.addTransaction({
    party_id: party.id,
    date: '2023-01-01',
    bill_no: '123',
    details: 'test',
    pcs: 1,
    rate: 1,
    credit: 1,
    payment: 0
  });
  const { error } = await supabase.from('Parties').delete().eq('id', party.id);
  console.log("Delete error with tx:", error);
}
test();
