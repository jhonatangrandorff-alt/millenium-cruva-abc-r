import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://acvpejgyqondqwsjbwaa.supabase.co", "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J");
async function listColumns() {
    const { data, error } = await supabase.from('base_oficial_millenium').select('*').limit(1);
    if (data && data.length > 0) {
        console.log("Columns found:", Object.keys(data[0]));
    } else {
        console.log("No data found or error:", error);
    }
}
listColumns();
