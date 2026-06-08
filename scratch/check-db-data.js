import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://acvpejgyqondqwsjbwaa.supabase.co", "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J");

async function checkData() {
    const { count, error } = await supabase
        .from('base_oficial_millenium')
        .select('*', { count: 'exact', head: true })
        .is('Código', null);
    
    console.log("Count of null Código rows:", count);

    const { count: emptyCount } = await supabase
        .from('base_oficial_millenium')
        .select('*', { count: 'exact', head: true })
        .eq('Código', '');
    
    console.log("Count of empty Código rows:", emptyCount);
}
checkData();
