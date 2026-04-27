import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://acvpejgyqondqwsjbwaa.supabase.co", "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J");

async function checkWrite() {
    const { data, error } = await supabase.from('base_oficial_millenium').insert([{}]);
    if (error) {
        console.error("ERRO:", error);
    } else {
        console.log("SUCESSO:", data);
        const { data: selectData } = await supabase.from('base_oficial_millenium').select('*').limit(1);
        console.log("Colunas presentes:", Object.keys(selectData[0]));
        await supabase.from('base_oficial_millenium').delete().neq('id', 'not_possible');
    }
}
checkWrite();
