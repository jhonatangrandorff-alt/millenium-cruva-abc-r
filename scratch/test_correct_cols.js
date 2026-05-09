import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://acvpejgyqondqwsjbwaa.supabase.co", "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J");
async function test() {
    const { error } = await supabase.from('base_oficial_millenium').insert([{
        'Código': 'TEST99',
        'Razão Social / Nome': 'TEST NAME',
        'status': 'Ativo'
    }]);
    console.log("Error:", error);
}
test();
