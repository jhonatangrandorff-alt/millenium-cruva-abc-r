import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://acvpejgyqondqwsjbwaa.supabase.co", "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J");
async function checkWrite() {
    const { data, error } = await supabase.from('base_oficial_millenium').insert([{ id: '999999', socialName: 'TEST' }]);
    console.log("Insert Error:", error);
}
checkWrite();
