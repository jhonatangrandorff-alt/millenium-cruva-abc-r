import { createClient } from '@supabase/supabase-js';

const url = "https://nqrtrzfkryihlllzdlgw.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcnRyemZrcnlpaGxsbHpkbGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODEyODQsImV4cCI6MjA4ODA1NzI4NH0.al_gpeQjLms0T1op8UyhdtaN7PJAaHxWGFPIx0ZJM_8";

const supabase = createClient(url, key);

async function checkWrite() {
    console.log('Tentando inserir cliente fake...');
    const { data, error } = await supabase.from('clients').upsert([{
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
        const { error: delError } = await supabase.from('clients').delete().eq('id', '999999');
        if (delError) console.error("Erro ao deletar", delError);
    }
}

checkWrite();
