import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

/**
 * Cria um client Supabase server-side ligado à sessão da requisição (via
 * cookies) e devolve também o id do usuário autenticado. Diferente de
 * `getRequestUserId`, este permite escrever (INSERT/DELETE) respeitando a RLS
 * do próprio usuário — usado pelas rotas de inscrição de push.
 */
export async function getRequestClient(
  request: NextRequest,
): Promise<{ supabase: SupabaseClient; userId: string } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: () => {
        /* rota de API: não renova cookies */
      },
    },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, userId: data.user.id };
}
