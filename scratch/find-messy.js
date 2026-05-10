import { createClient } from '@supabase/supabase-js';

const url = "https://acvpejgyqondqwsjbwaa.supabase.co";
const key = "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J";

const supabase = createClient(url, key);

async function findMessy() {
    console.log('Buscando registros sujos...');
    const { data, error } = await supabase.from('base_oficial_millenium').select('*');
    
    if (error) {
        console.error(error);
        return;
    }

    const messy = data.filter(r => {
        const social = String(r['Razão Social / Nome'] || '');
        const fantasy = String(r['Nome Fantasia'] || '');
        return /^[\d./-]{5,}/.test(social) || /^[\d./-]{5,}/.test(fantasy);
    });

    console.log(`Total sujos encontrados: ${messy.length}`);
    if (messy.length > 0) {
        messy.slice(0, 5).forEach(r => {
            console.log(`ID: ${r['Código']} | Social: "${r['Razão Social / Nome']}" | Fantasy: "${r['Nome Fantasia']}"`);
        });
    }
}

findMessy();
