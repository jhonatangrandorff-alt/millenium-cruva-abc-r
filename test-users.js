import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://acvpejgyqondqwsjbwaa.supabase.co", "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J");
async function check() {
    const { data, error } = await supabase.from('users').select('*');
    console.log(error || data);
}
check();
