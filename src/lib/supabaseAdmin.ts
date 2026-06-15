import { createClient } from '@supabase/supabase-js';

// СЕРВЕРНЫЙ клиент с service_role ключом.
// Работает в обход RLS. ИСПОЛЬЗОВАТЬ ТОЛЬКО В API-РОУТАХ (никогда на клиенте!).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
