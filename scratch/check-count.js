import { createClient } from '@supabase/supabase-js';

const url = "https://acvpejgyqondqwsjbwaa.supabase.co";
const key = "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J";

const supabase = createClient(url, key);

async function checkCount() {
    const { count, error } = await supabase.from('base_oficial_millenium').select('*', { count: 'exact', head: true });
    console.log(`Total de registros no banco: ${count}`);
}

checkCount();
