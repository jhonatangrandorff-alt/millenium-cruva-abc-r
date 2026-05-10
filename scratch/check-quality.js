import { createClient } from '@supabase/supabase-js';

const url = "https://acvpejgyqondqwsjbwaa.supabase.co";
const key = "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J";

const supabase = createClient(url, key);

async function checkDataQuality() {
    console.log('Verificando qualidade dos nomes no banco...');
    // Usando asterisco para evitar erro de parse nas aspas/espaços
    const { data, error } = await supabase.from('base_oficial_millenium').select('*').limit(100);
    
    if (error) {
        console.error(error);
        return;
    }

    let messyCount = 0;
    data.forEach(r => {
        const name = String(r['Razão Social / Nome'] || '');
        if (/^[\d./-]{5,}/.test(name)) {
            messyCount++;
            if (messyCount <= 10) {
                console.log(`[MESSY] ID: ${r['Código']} | Name: ${name}`);
            }
        }
    });

    console.log(`\nResumo da amostra (100 registros):`);
    console.log(`Nomes com prefixo numérico: ${messyCount}`);
}

checkDataQuality();
