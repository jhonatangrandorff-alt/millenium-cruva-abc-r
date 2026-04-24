import { createClient } from '@supabase/supabase-js';

const url = "https://nqrtrzfkryihlllzdlgw.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcnRyemZrcnlpaGxsbHpkbGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODEyODQsImV4cCI6MjA4ODA1NzI4NH0.al_gpeQjLms0T1op8UyhdtaN7PJAaHxWGFPIx0ZJM_8";

const supabase = createClient(url, key);

async function check() {
    console.log('Fetching clients...');
    const { data, error } = await supabase.from('clients').select('id, socialName').limit(5);
    if (error) {
        console.error('Error fetching:', error);
    } else {
        console.log('Clients in DB:', data);
    }
}

check();
