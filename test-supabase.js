import { createClient } from '@supabase/supabase-js';

const url = "https://ndlqdcccrimqktzxaozl.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kbHFkY2NjcmltcWt0enhhb3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNDAyNDEsImV4cCI6MjA5MjYxNjI0MX0.QalzSGDFcV37jaZ5yx2qwb6YvNvCl7dBxk740NOwmzE";

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
