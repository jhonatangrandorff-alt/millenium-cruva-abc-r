import { createClient } from '@supabase/supabase-js';

const url = "https://nqrtrzfkryihlllzdlgw.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcnRyemZrcnlpaGxsbHpkbGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODEyODQsImV4cCI6MjA4ODA1NzI4NH0.al_gpeQjLms0T1op8UyhdtaN7PJAaHxWGFPIx0ZJM_8";

const supabase = createClient(url, key);

async function check() {
    console.log('Fetching from base_oficial_millenium...');
    const { data, count, error } = await supabase
        .from('base_oficial_millenium')
        .select('*', { count: 'exact', head: true });
        
    if (error) {
        console.error('Error fetching:', error);
    } else {
        console.log('Total records in Production DB:', count);
        
        const { data: sample } = await supabase
            .from('base_oficial_millenium')
            .select('city, representativeName, status')
            .limit(3);
        console.log('Sample data:', sample);
    }
}

check();
