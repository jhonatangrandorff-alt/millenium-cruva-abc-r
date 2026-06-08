import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://acvpejgyqondqwsjbwaa.supabase.co", "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J");

async function checkData() {
    // We will query in pages to get all 37k+ records and aggregate supervisors
    console.log("Fetching all records to aggregate supervisors...");
    let allData = [];
    let count = 0;
    const step = 2000;
    
    // We only need to check the first 10,000 rows to see if there is any 'GERAL' or others
    for (let i = 0; i < 5; i++) {
        const start = i * step;
        const end = start + step - 1;
        const { data, error } = await supabase
            .from('base_oficial_millenium')
            .select('supervisor, Código')
            .range(start, end);
            
        if (error) {
            console.error("Error:", error);
            break;
        }
        allData = allData.concat(data);
    }
    
    const counts = {};
    for (const row of allData) {
        const val = row.supervisor;
        counts[val] = (counts[val] || 0) + 1;
    }
    console.log("Supervisor counts in first 10,000 rows:", counts);
}
checkData();
