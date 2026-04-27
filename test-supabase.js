import { createClient } from '@supabase/supabase-js';

const url = "https://acvpejgyqondqwsjbwaa.supabase.co";
const key = "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J";

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
