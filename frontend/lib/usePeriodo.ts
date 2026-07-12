"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

export type Modo = "mensal" | "anual";

/**
 * Filtro de período global, persistido na URL (query params).
 * `?modo=mensal|anual`. Todos os gráficos da página leem daqui.
 */
export function usePeriodo() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const modo: Modo = searchParams.get("modo") === "anual" ? "anual" : "mensal";

  const setModo = useCallback(
    (next: Modo) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("modo", next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  return { modo, setModo };
}
