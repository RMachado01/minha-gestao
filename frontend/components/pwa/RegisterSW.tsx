"use client";

import { useEffect } from "react";

/**
 * Registra o service worker (somente em produção, para não atrapalhar o dev
 * com cache). Habilita instalação como PWA e o fallback offline.
 */
export function RegisterSW() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* silencioso: PWA é progressivo, a falha não quebra o app */
      });
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);
  return null;
}
