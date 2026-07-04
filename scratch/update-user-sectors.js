import { createClient } from '@supabase/supabase-js';

const url = "https://acvpejgyqondqwsjbwaa.supabase.co";
const key = "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J";
const supabase = createClient(url, key);

async function updateSectors() {
    console.log("Fetching users first...");
    const { data: users, error: fetchError } = await supabase.from('users').select('*');
    if (fetchError) {
        console.error("Error fetching users:", fetchError);
        return;
    }

    console.log("Current users in database:", users);

    const updates = [
        {
            username: 'CLAUDIO',
            newSectors: [ 'CLAUDIO GERENTE', 'SETOR 01', 'CLAUDIO ROBERTO CASACCHI' ]
        },
        {
            username: 'REGINALDO',
            newSectors: [ 'REGINALDO GERENTE', 'SETOR 09', 'SETOR 06', 'SETOR 05', 'SETOR 14', 'REGINALDO DOS SANTOS FIGUEIREDO' ]
        },
        {
            username: 'LUIZ',
            newSectors: [ 'SETOR 09', 'LUIS MIRANDA' ]
        }
    ];

    for (const update of updates) {
        const user = users.find(u => u.username === update.username);
        if (user) {
            console.log(`Updating sectors for user ${update.username}...`);
            const { error: updateError } = await supabase
                .from('users')
                .update({ sectors: update.newSectors })
                .eq('id', user.id);

            if (updateError) {
                console.error(`Error updating ${update.username}:`, updateError);
            } else {
                console.log(`Successfully updated ${update.username} to sectors:`, update.newSectors);
            }
        } else {
            console.warn(`User ${update.username} not found in DB!`);
        }
    }
}

updateSectors();
