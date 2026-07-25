import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client com service role (ignora RLS). Usado SOMENTE em rotas de servidor
 * confiáveis (ex.: cron de notificações) para ler dados de todos os usuários.
 * Nunca deve ser importado em código que roda no navegador.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
