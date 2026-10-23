import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://nzoswtawxjjpnuygpska.supabase.co';
// Publishable key is explicitly designed for browser use; database policies enforce ownership.
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_7TNwSJJcsxVrN6nYdVQkSg_p8yjMQ3k';
export const supabase = createClient(URL,KEY,{
 auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},
});
