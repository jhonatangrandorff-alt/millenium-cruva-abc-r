import { createClient } from '@supabase/supabase-js';

const url = "https://acvpejgyqondqwsjbwaa.supabase.co";
const key = "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J";
const supabase = createClient(url, key);

async function checkMapping() {
    console.log("Fetching representatives and supervisors...");
    let mapping = {};
    let offset = 0;
    const limit = 5000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('base_oficial_millenium')
            .select('representativeName, rep3, supervisor')
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("Error:", error);
            break;
        }

        if (data.length === 0) {
            hasMore = false;
        } else {
            data.forEach(row => {
                const rep = row.rep3 || row.representativeName || 'SEM REP';
                const sup = row.supervisor || 'SEM SUP';
                const key = `${sup} -> ${rep}`;
                mapping[key] = (mapping[key] || 0) + 1;
            });
            offset += data.length;
        }
    }

    console.log("Supervisor -> Representative mapping counts:");
    const sorted = Object.entries(mapping).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([k, v]) => {
        console.log(`${k}: ${v}`);
    });
}

checkMapping();
