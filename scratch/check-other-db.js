import { createClient } from '@supabase/supabase-js';
const url = "https://nqrtrzfkryihlllzdlgw.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcnRyemZrcnlpaGxsbHpkbGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODEyODQsImV4cCI6MjA4ODA1NzI4NH0.al_gpeQjLms0T1op8UyhdtaN7PJAaHxWGFPIx0ZJM_8";

const supabase = createClient(url, key);

async function check() {
    const { count, error } = await supabase
        .from('base_oficial_millenium')
        .select('*', { count: 'exact', head: true });
        
    console.log("Count in other DB table 'base_oficial_millenium':", count);
    console.log("Error:", error);

    const { count: clientCount, error: clientErr } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });
        
    console.log("Count in other DB table 'clients':", clientCount);
    console.log("Error:", clientErr);
}
check();
