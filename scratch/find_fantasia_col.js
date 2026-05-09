import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://acvpejgyqondqwsjbwaa.supabase.co", "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J");

async function findFantasia() {
    const variations = ['Fantasia', 'Nome Fantasia', 'fantasyName', 'fantasia', 'Nome_Fantasia'];
    for (const v of variations) {
        console.log(`Trying to insert into: ${v}`);
        const { error } = await supabase.from('base_oficial_millenium').insert({
            'Código': 'TEST_F',
            'Razão Social / Nome': 'TEST_F',
            [v]: 'TEST_VAL'
        });
        if (!error) {
            console.log(`✅ SUCCESS with column: ${v}`);
            await supabase.from('base_oficial_millenium').delete().eq('Código', 'TEST_F');
            return v;
        } else {
            console.log(`❌ FAILED with ${v}: ${error.message}`);
        }
    }
    return null;
}
findFantasia();
