import { createClient, SupabaseClient } from '@supabase/supabase-js';

// СЕРВЕРНЫЙ клиент с service_role ключом (в обход RLS).
// ИСПОЛЬЗОВАТЬ ТОЛЬКО В API-РОУТАХ (никогда на клиенте!).
//
// Клиент создаётся ЛЕНИВО — только при первом реальном обращении (в рантайме),
// а не при загрузке модуля. Это нужно чтобы сборка (build) не падала,
// когда переменные окружения ещё не подставлены.

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

// Прокси: все вызовы (.from(), .rpc() и т.д.) идут к лениво созданному клиенту
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
