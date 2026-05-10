import { createClient } from '@supabase/supabase-js';

const url = "https://acvpejgyqondqwsjbwaa.supabase.co";
const key = "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J";

const supabase = createClient(url, key);

async function inspectTypes() {
    const { data, error } = await supabase.from('base_oficial_millenium').select('*').limit(1);
    if (data && data.length > 0) {
        const row = data[0];
        console.log('Tipos das colunas:');
        Object.keys(row).forEach(key => {
            console.log(`${key}: ${typeof row[key]} (Value: ${row[key]})`);
        });
    }
}

inspectTypes();
