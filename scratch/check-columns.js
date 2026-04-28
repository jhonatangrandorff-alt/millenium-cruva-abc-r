import { createClient } from '@supabase/supabase-js';

const globalUrl = 'https://acvpejgyqondqwsjbwaa.supabase.co';
const globalKey = 'sb_publishable_Ln6v8O62FZFOix_pjwtR2w_oEI0lF2J';

const supabase = createClient(globalUrl, globalKey);

async function check() {
  const { data, error } = await supabase.from('base_oficial_millenium').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}

check();
