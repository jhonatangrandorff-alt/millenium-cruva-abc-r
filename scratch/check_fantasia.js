import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://acvpejgyqondqwsjbwaa.supabase.co", "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J");

async function checkVariations() {
    const variations = ['Fantasia', 'Nome Fantasia', 'fantasyName', 'fantasy_name', 'fantasia'];
    for (const v of variations) {
        console.log(`Checking column: ${v}`);
        const { error } = await supabase.from('base_oficial_millenium').select(v).limit(1);
        if (!error) {
            console.log(`✅ Column ${v} EXISTS!`);
        } else {
            console.log(`❌ Column ${v} DOES NOT EXIST. Error: ${error.message}`);
        }
    }
}
checkVariations();
