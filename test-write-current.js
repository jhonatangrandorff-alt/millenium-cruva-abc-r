import { createClient } from '@supabase/supabase-js';

const url = "https://acvpejgyqondqwsjbwaa.supabase.co";
const key = "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J";

const supabase = createClient(url, key);

async function checkWrite() {
    console.log('Tentando inserir cliente fake...');
    const { data, error } = await supabase.from('base_oficial_millenium').upsert([{
        id: '999999',
        socialName: 'TESTE AGENTE',
        representativeName: 'TEST',
        supervisor: 'TEST',
        status: 'Ativo'
    }]);

    if (error) {
        console.error('Erro ao escrever no Supabase:', JSON.stringify(error, null, 2));
    } else {
        console.log('Insert/Upsert realizado com sucesso!', data);
        console.log('Limpando teste...');
        await supabase.from('base_oficial_millenium').delete().eq('id', '999999');
    }
}

checkWrite();
