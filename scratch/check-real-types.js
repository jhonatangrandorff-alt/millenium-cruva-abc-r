import { createClient } from '@supabase/supabase-js';

const url = "https://acvpejgyqondqwsjbwaa.supabase.co";
const key = "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J";

const supabase = createClient(url, key);

async function inspectRealData() {
    // Buscar o primeiro registro que não tenha Código nulo
    const { data, error } = await supabase.from('base_oficial_millenium').select('*').not('Código', 'is', null).limit(1);
    
    if (error) {
        console.error('Erro:', error);
        return;
    }

    if (data && data.length > 0) {
        const row = data[0];
        console.log('Tipos das colunas (Dados Reais):');
        Object.keys(row).forEach(key => {
            console.log(`${key}: ${typeof row[key]} (Value: ${row[key]})`);
        });
    } else {
        console.log('Nenhum dado real encontrado.');
    }
}

inspectRealData();
