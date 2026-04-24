import { createClient } from '@supabase/supabase-js';

const url = "https://nqrtrzfkryihlllzdlgw.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcnRyemZrcnlpaGxsbHpkbGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODEyODQsImV4cCI6MjA4ODA1NzI4NH0.al_gpeQjLms0T1op8UyhdtaN7PJAaHxWGFPIx0ZJM_8";

const client = createClient(url, key);

async function checkPaging() {
    console.log("Iniciando paginação...");
    let allData = [];
    let start = 0;
    const step = 1000;
    let hasMore = true;

    try {
        while (hasMore) {
            const { data, error } = await client
                .from('clients')
                .select('id')
                .range(start, start + step - 1);

            if (error) {
                console.error("Error no loop", error);
                break;
            }

            if (data && data.length > 0) {
                allData = [...allData, ...data];
                start += step;
                process.stdout.write(`.`); // progress
                if (data.length < step) {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }
        }
        console.log(`\nFinalizado Fetch. Total: ${allData.length} records`);
    } catch (err) {
        console.error(err);
    }
}

checkPaging();
