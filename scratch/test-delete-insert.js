import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://acvpejgyqondqwsjbwaa.supabase.co", "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J");

async function checkWrite() {
    const id = '999999';
    console.log("Deletando...");
    await supabase.from('base_oficial_millenium').delete().eq('Código', id);

    console.log("Inserindo com coluna abc...");
    const { error: insError } = await supabase.from('base_oficial_millenium').insert([{
        'Código': id,
        'Razão Social / Nome': 'TEST DELETION INSERTION',
        'status': 'Ativo',
        'abc': 'A'
    }]);
    console.log("Insert Error:", insError);
}
checkWrite();
