import { createClient } from '@supabase/supabase-js';

const url = "https://acvpejgyqondqwsjbwaa.supabase.co";
const key = "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J";
const supabase = createClient(url, key);

async function checkAllDuplicates() {
    console.log("Fetching all records in pages to check for duplicates...");
    let allData = [];
    const step = 2000;
    
    // We fetch pages until we get no more data
    let page = 0;
    while (true) {
        const start = page * step;
        const end = start + step - 1;
        const { data, error } = await supabase
            .from('base_oficial_millenium')
            .select('Código')
            .range(start, end);
            
        if (error) {
            console.error("Error fetching page:", error);
            break;
        }
        
        if (!data || data.length === 0) {
            break;
        }
        
        allData = allData.concat(data);
        console.log(`Fetched ${allData.length} records...`);
        page++;
    }
    
    console.log(`Total records fetched: ${allData.length}`);
    
    const counts = {};
    allData.forEach((row, index) => {
        const val = row['Código'];
        counts[val] = counts[val] || [];
        counts[val].push(index);
    });
    
    const dupes = Object.entries(counts).filter(([val, indices]) => indices.length > 1);
    
    console.log(`Total unique IDs: ${Object.keys(counts).length}`);
    console.log(`Total duplicate IDs: ${dupes.length}`);
    
    if (dupes.length > 0) {
        console.log("Examples of duplicates (first 5):");
        dupes.slice(0, 5).forEach(([val, indices]) => {
            console.log(`ID: ${val} appears ${indices.length} times at indices:`, indices);
        });
    } else {
        console.log("No duplicate IDs found!");
    }
}

checkAllDuplicates();
