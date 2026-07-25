import { idbGet, idbSet } from "./store";

/**
 * `fetch` com cache de leitura para o Supabase. Estratégia network-first:
 * - Consultas GET ao REST do Supabase: tenta a rede; se der certo, guarda a
 *   resposta no IndexedDB e a devolve; se a rede falhar (offline), devolve a
 *   última resposta salva marcada com o header `x-mg-offline: 1`.
 * - Qualquer outra coisa (escrita, RPC, auth): passa direto sem cache. Ou
 *   seja, escrever exige conexão — só a LEITURA funciona offline.
 */

function headerValue(headers: HeadersInit | undefined, name: string): string {
  if (!headers) return "";
  if (headers instanceof Headers) return headers.get(name) ?? "";
  if (Array.isArray(headers)) {
    const found = headers.find(([k]) => k.toLowerCase() === name.toLowerCase());
    return found?.[1] ?? "";
  }
  const record = headers as Record<string, string>;
  return record[name] ?? record[name.toLowerCase()] ?? record[name.toUpperCase()] ?? "";
}

/** Extrai o id do usuário (sub) do JWT para isolar o cache por conta. */
function ownerFromAuth(auth: string): string {
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const payload = token.split(".")[1];
  if (!payload) return "anon";
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(json) as { sub?: string };
    return parsed.sub ?? "anon";
  } catch {
    return "anon";
  }
}

export function createCachedFetch(): typeof fetch {
  return async function cachedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (
      init?.method ??
      (typeof input === "object" && "method" in input ? input.method : "GET")
    ).toUpperCase();

    const isRestGet = method === "GET" && url.includes("/rest/v1/");
    if (!isRestGet) {
      return fetch(input, init);
    }

    const auth =
      headerValue(init?.headers, "Authorization") ||
      (typeof input === "object" && "headers" in input ? input.headers.get("Authorization") ?? "" : "");
    const key = `${ownerFromAuth(auth)}:${url}`;

    try {
      const response = await fetch(input, init);
      if (response.ok) {
        const clone = response.clone();
        void clone.text().then((body) =>
          idbSet(key, { body, contentRange: response.headers.get("content-range"), ts: Date.now() }),
        );
      }
      return response;
    } catch (error) {
      const cached = await idbGet(key);
      if (cached) {
        return new Response(cached.body, {
          status: 200,
          statusText: "OK (offline cache)",
          headers: {
            "Content-Type": "application/json",
            "content-range": cached.contentRange ?? "*/*",
            "x-mg-offline": "1",
          },
        });
      }
      throw error;
    }
  };
}
