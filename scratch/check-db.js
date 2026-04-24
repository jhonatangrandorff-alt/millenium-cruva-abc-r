
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nqrtrzfkryihlllzdlgw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcnRyemZrcnlpaGxsbHpkbGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODEyODQsImV4cCI6MjA4ODA1NzI4NH0.al_gpeQjLms0T1op8UyhdtaN7PJAaHxWGFPIx0ZJM_8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking base_oficial_millenium...');
  const { count, error } = await supabase
    .from('base_oficial_millenium')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Total records in base_oficial_millenium:', count);
  }

  console.log('Checking users...');
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('username, sectors');
  
  if (userError) {
    console.error('User Error:', userError);
  } else {
    console.log('Users found:', users.length);
    console.log('User list:', JSON.stringify(users, null, 2));
  }
}

check();
