import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres:aLONE143...A@db.utyhcyjdvzezvagrmbxg.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  await client.query("UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = 'abuhanif8963@gmail.com'");
  console.log("User confirmed");
  await client.end();
}
run().catch(console.error);
