import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://utyhcyjdvzezvagrmbxg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0eWhjeWpkdnplenZhZ3JtYnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMTU3OTIsImV4cCI6MjEwMDc5MTc5Mn0.CPvz_UasSTkWI7cpbOOBBQiR0Ja-VmtL7XHOoVik7IM'
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data, error } = await supabase.from('Parties').select('*')
  console.log("Parties:", data, error)
}
test()
