import { createClient } from '@supabase/supabase-js';

const url = "https://acvpejgyqondqwsjbwaa.supabase.co";
const key = "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J";
const supabase = createClient(url, key);

async function testFetchNoOrder() {
    console.log("Simulating fetchClients logic without order...");
    const total = 37624;
    const step = 1000;
    const pages = Math.ceil(total / step);
    let allData = [];
    
    // We will fetch pages sequentially or in parallel, similar to the service
    const CONCURRENCY_LIMIT = 5;
    for (let i = 0; i < pages; i += CONCURRENCY_LIMIT) {
        const batchPromises = [];
        for (let j = i; j < Math.min(i + CONCURRENCY_LIMIT, pages); j++) {
            const start = j * step;
            const end = start + step - 1;
            batchPromises.push(
                supabase
                    .from('base_oficial_millenium')
                    .select('Código')
                    .range(start, end)
                    .then(({ data, error }) => {
                        if (error) throw error;
                        return data;
                    })
            );
        }
        const results = await Promise.all(batchPromises);
        results.forEach(data => {
            allData = [...allData, ...data];
        });
        console.log(`Fetched through page ${Math.min(i + CONCURRENCY_LIMIT, pages)}... Total rows: ${allData.length}`);
    }
    
    const counts = {};
    allData.forEach(row => {
        const id = row['Código'];
        counts[id] = (counts[id] || 0) + 1;
    });
    
    const duplicates = Object.entries(counts).filter(([id, count]) => count > 1);
    console.log(`Total rows fetched: ${allData.length}`);
    console.log(`Unique IDs fetched: ${Object.keys(counts).length}`);
    console.log(`Duplicate IDs in fetched list: ${duplicates.length}`);
}

testFetchNoOrder();
