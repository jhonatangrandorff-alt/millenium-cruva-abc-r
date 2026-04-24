
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nqrtrzfkryihlllzdlgw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcnRyemZrcnlpaGxsbHpkbGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODEyODQsImV4cCI6MjA4ODA1NzI4NH0.al_gpeQjLms0T1op8UyhdtaN7PJAaHxWGFPIx0ZJM_8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Listing users in DB...');
  const { data, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Users:', JSON.stringify(data, null, 2));
}

check();
