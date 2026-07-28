import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres:aLONE143...A@db.utyhcyjdvzezvagrmbxg.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT relname, relrowsecurity 
    FROM pg_class 
    WHERE relname IN ('Parties', 'Transactions', 'Products', 'Expenses', 'Sales');
  `);
  console.log("RLS Status:", res.rows);
  await client.end();
}
run().catch(console.error);
