import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres:aLONE143...A@db.utyhcyjdvzezvagrmbxg.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  await client.query("DELETE FROM auth.users WHERE email = 'abuhanif8963@gmail.com'");
  console.log("User deleted");
  await client.end();
}
run().catch(console.error);
