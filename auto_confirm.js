import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres:aLONE143...A@db.utyhcyjdvzezvagrmbxg.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  await client.query(`
    CREATE OR REPLACE FUNCTION public.auto_confirm_user()
    RETURNS trigger AS $$
    BEGIN
      NEW.email_confirmed_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    DROP TRIGGER IF EXISTS auto_confirm_user_trigger ON auth.users;

    CREATE TRIGGER auto_confirm_user_trigger
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user();
  `);
  console.log("Trigger created");
  await client.end();
}
run().catch(console.error);
