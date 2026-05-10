import { createClient } from '@supabase/supabase-js';

const url = "https://acvpejgyqondqwsjbwaa.supabase.co";
const key = "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J";

const supabase = createClient(url, key);

async function checkDuplicates() {
    console.log('Verificando duplicatas por Código...');
    const { data, error } = await supabase.from('base_oficial_millenium').select('Código');
    
    if (error) {
        console.error(error);
        return;
    }

    const counts = {};
    data.forEach(r => {
        const id = String(r['Código']);
        counts[id] = (counts[id] || 0) + 1;
    });

    const duplicates = Object.entries(counts).filter(([id, count]) => count > 1);
    console.log(`Total de registros: ${data.length}`);
    console.log(`Total de IDs únicos: ${Object.keys(counts).length}`);
    console.log(`IDs com duplicatas: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
        console.log('Exemplo de duplicata:', duplicates[0]);
    }
}

checkDuplicates();
