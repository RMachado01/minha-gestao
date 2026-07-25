import { createBrowserClient } from "@supabase/ssr";
import { createCachedFetch } from "@/lib/offline/cachedFetch";
import { idbClear } from "@/lib/offline/store";

let cachedFetch: typeof fetch | undefined;
let signOutListenerAttached = false;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  // Fetch com cache de leitura (offline). Reaproveitado entre chamadas.
  if (typeof window !== "undefined" && !cachedFetch) {
    cachedFetch = createCachedFetch();
  }

  const client = createBrowserClient(
    url,
    key,
    cachedFetch ? { global: { fetch: cachedFetch } } : undefined,
  );

  // Ao sair da conta, limpa o cache offline (higiene de dados no aparelho).
  if (typeof window !== "undefined" && !signOutListenerAttached) {
    signOutListenerAttached = true;
    client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") void idbClear();
    });
  }

  return client;
}
