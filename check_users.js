import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres:aLONE143...A@db.utyhcyjdvzezvagrmbxg.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT email FROM auth.users");
  console.log("Users:", res.rows);
  await client.end();
}
run().catch(console.error);
