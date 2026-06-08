import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://acvpejgyqondqwsjbwaa.supabase.co", "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J");

async function checkUsers() {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Users in DB:");
        console.log(data);
    }
}
checkUsers();
