import { createClient } from '@supabase/supabase-js';

const url = "https://acvpejgyqondqwsjbwaa.supabase.co";
const key = "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J";

const supabase = createClient(url, key);

async function dumpData() {
    console.log('Dump do conteúdo do banco...');
    const { data, error } = await supabase.from('base_oficial_millenium').select('*').limit(5);
    
    if (error) {
        console.error(error);
        return;
    }

    data.forEach(r => {
        console.log(`ID: ${r['Código']} | Social: "${r['Razão Social / Nome']}" | Fantasy: "${r['Nome Fantasia']}"`);
    });
}

dumpData();
