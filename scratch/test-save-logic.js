import { createClient } from '@supabase/supabase-js';

const url = "https://acvpejgyqondqwsjbwaa.supabase.co";
const key = "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J";

const supabase = createClient(url, key);

async function testSave() {
    console.log('Testando lógica de salvamento idêntica ao supabaseService...');
    
    const chunk = [{
        'Código': '999999',
        'Razão Social / Nome': 'TESTE LIMPEZA NOME',
        'Nome Fantasia': 'TESTE FANTASIA',
        'cnpj': '00.000.000/0001-00',
        'city': 'TESTE CIDADE',
        'status': 'Ativo'
    }];

    console.log('Tentando DELETE...');
    const { error: delError } = await supabase.from('base_oficial_millenium').delete().in('Código', ['999999']);
    if (delError) console.log('Aviso no Delete:', delError.message);

    console.log('Tentando INSERT...');
    const { error: insError } = await supabase.from('base_oficial_millenium').insert(chunk);
    
    if (insError) {
        console.error('ERRO NO INSERT:', JSON.stringify(insError, null, 2));
    } else {
        console.log('INSERT SUCESSO!');
    }
}

testSave();
