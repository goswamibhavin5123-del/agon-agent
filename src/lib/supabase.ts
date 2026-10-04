import { createClient } from '@supabase/supabase-js';

const env = import.meta.env as any;
const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const key = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

const supabase = createClient(url, key);
export default supabase;
