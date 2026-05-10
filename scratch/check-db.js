import { createClient } from '@supabase/supabase-js';

const url = "https://acvpejgyqondqwsjbwaa.supabase.co";
const key = "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J";

const supabase = createClient(url, key);

async function inspectSchema() {
    console.log('Inspecionando colunas da tabela base_oficial_millenium...');
    const { data, error } = await supabase.from('base_oficial_millenium').select('*').limit(1);

    if (error) {
        console.error('Erro ao buscar dados:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Colunas encontradas:', Object.keys(data[0]));
        console.log('Exemplo de registro:', data[0]);
    } else {
        console.log('Tabela vazia. Tentando buscar nomes de colunas via RPC ou metadados...');
        // Fallback: tentar inserir um registro fake com colunas erradas para ver o erro e os nomes sugeridos
        const { error: insertError } = await supabase.from('base_oficial_millenium').insert([{ fake_col: 'test' }]);
        console.log('Dica de erro do Supabase:', insertError?.message);
    }
}

inspectSchema();
