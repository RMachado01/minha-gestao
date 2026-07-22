import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

/**
 * Recupera o id do usuário autenticado a partir dos cookies da requisição.
 * Usado por rotas server-side (API) para exigir sessão válida do Supabase.
 * Retorna `null` quando não há sessão ou o Supabase não está configurado.
 */
export async function getRequestUserId(request: NextRequest): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: () => {
        /* rota somente-leitura: não renova cookies */
      },
    },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}
