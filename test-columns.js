import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://acvpejgyqondqwsjbwaa.supabase.co", "sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J");

const VALID_CLIENT_COLUMNS = [
  'id', 'socialName', 'fantasyName', 'cnpj', 'ie', 'city', 'state', 
  'address', 'neighborhood', 'cep', 'activity', 'group', 
  'lastPurchaseDate', 'daysSincePurchase', 'registerDate', 
  'representativeName', 'rep3', 'supervisor', 'population', 'status'
];

async function checkWrite() {
    console.log('Testando insert com todas as colunas...');
    const fakeRecord = {};
    for (const col of VALID_CLIENT_COLUMNS) {
        if (['daysSincePurchase', 'population'].includes(col)) fakeRecord[col] = 0;
        else if (['lastPurchaseDate', 'registerDate'].includes(col)) fakeRecord[col] = '2025-01-01';
        else fakeRecord[col] = 'TEST';
    }
    
    const { data, error } = await supabase.from('base_oficial_millenium').insert([fakeRecord]);
    if (error) {
        console.error("ERRO SUPABASE:", error);
    } else {
        console.log("SUCESSO:", data);
        await supabase.from('base_oficial_millenium').delete().eq('id', 'TEST');
    }
}
checkWrite();
