"use client";

import { useSyncExternalStore } from "react";
import { CloudOff } from "lucide-react";

/**
 * Barra discreta que aparece quando o aparelho está sem conexão, avisando que
 * os dados exibidos vêm do cache (leitura offline) e podem estar desatualizados.
 */
function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  if (online) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[var(--z-toast,60)] flex items-center justify-center gap-2 bg-amber-500/95 px-4 py-1.5 text-center text-xs font-medium text-black shadow-md"
      style={{ paddingTop: "max(0.375rem, env(safe-area-inset-top))" }}
    >
      <CloudOff className="size-3.5 shrink-0" />
      Você está offline — mostrando dados salvos, que podem estar desatualizados.
    </div>
  );
}
