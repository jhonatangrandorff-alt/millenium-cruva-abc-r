import { createClient } from '@supabase/supabase-js';

const url = "https://acvpejgyqondqwsjbwaa.supabase.co";
const key = "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J";

const supabase = createClient(url, key);

async function testUpsert() {
    console.log('Testando UPSERT com onConflict...');
    const { error } = await supabase.from('base_oficial_millenium').upsert({
        'Código': '999999',
        'Razão Social / Nome': 'TESTE UPSERT',
        'status': 'Ativo'
    }, { onConflict: 'Código' });

    if (error) {
        console.error('ERRO NO UPSERT:', error.message);
    } else {
        console.log('UPSERT SUCESSO!');
    }
}

testUpsert();
