import { createClient } from '@supabase/supabase-js';

const url = "https://acvpejgyqondqwsjbwaa.supabase.co";
const key = "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J";
const supabase = createClient(url, key);

async function countSupervisors() {
    console.log("Fetching all records in batches...");
    let allSupervisors = {};
    let offset = 0;
    const limit = 5000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('base_oficial_millenium')
            .select('supervisor')
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("Error fetching data:", error);
            break;
        }

        if (data.length === 0) {
            hasMore = false;
        } else {
            data.forEach(row => {
                const s = row.supervisor || 'NULL';
                allSupervisors[s] = (allSupervisors[s] || 0) + 1;
            });
            console.log(`Fetched ${offset + data.length} rows...`);
            offset += data.length;
        }
    }

    console.log("All supervisor counts in database:");
    console.log(allSupervisors);
}

countSupervisors();
