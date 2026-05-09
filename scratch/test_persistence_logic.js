
import { createClient } from '@supabase/supabase-js';

const url = 'https://acvpejgyqondqwsjbwaa.supabase.co';
const key = 'sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J';
const supabase = createClient(url, key);

async function testSave() {
    const testId = 'TEST_' + Date.now();
    const record = {
        'Código': testId,
        'Razão Social / Nome': 'TESTE PERSISTENCIA ' + new Date().toLocaleString(),
        'Nome Fantasia': 'FANTASIA TESTE',
        'status': 'Ativo'
    };

    console.log('Tentando salvar:', record);

    // Tentar o fluxo do App: Delete depois Insert
    const { error: delError } = await supabase.from('base_oficial_millenium').delete().eq('Código', testId);
    console.log('Delete error:', delError);

    const { error: insError } = await supabase.from('base_oficial_millenium').insert([record]);
    if (insError) {
        console.error('Insert error:', insError);
    } else {
        console.log('Insert SUCESSO');
        
        // Verificar se salvou mesmo
        const { data, error: selError } = await supabase.from('base_oficial_millenium').select('*').eq('Código', testId);
        console.log('Verificação:', data);
        if (data && data.length > 0) {
            console.log('PERSISTENCIA CONFIRMADA');
        } else {
            console.log('ERRO: Record sumiu após insert!');
        }
    }
}

testSave();
