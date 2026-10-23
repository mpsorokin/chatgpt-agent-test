import { createClient } from '@supabase/supabase-js';

const URL = 'https://nzoswtawxjjpnuygpska.supabase.co';
// Publishable key is explicitly designed for browser use; database policies enforce ownership.
const KEY = 'sb_publishable_7TNwSJJcsxVrN6nYdVQkSg_p8yjMQ3k';
export const supabase = createClient(URL,KEY,{
 auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},
});
