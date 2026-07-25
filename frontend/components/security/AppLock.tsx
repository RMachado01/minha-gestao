"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { LoaderCircle, Lock } from "lucide-react";
import { isLockEnabled, isUnlocked, markUnlocked, onLockChange, verifyPin } from "@/lib/lock";

/** Estado externo do bloqueio (localStorage + evento), lido via store. */
function subscribe(callback: () => void): () => void {
  const off = onLockChange(callback);
  const onVis = () => callback();
  document.addEventListener("visibilitychange", onVis);
  return () => {
    off();
    document.removeEventListener("visibilitychange", onVis);
  };
}
const getSnapshot = () => isLockEnabled() && !isUnlocked();
const getServerSnapshot = () => false;

/**
 * Overlay de desbloqueio: aparece quando o bloqueio por PIN está ativo e a
 * sessão ainda não foi desbloqueada. Cobre todo o app (opaco, z máximo).
 */
export function AppLock() {
  const locked = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [pin, setPin] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(false);

  // Espelha o estado no <html data-locked> (usado pela CSS anti-flash).
  useEffect(() => {
    document.documentElement.dataset.locked = locked ? "1" : "";
    return () => {
      document.documentElement.dataset.locked = "";
    };
  }, [locked]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 4 || checking) return;
    setChecking(true);
    setError(false);
    const ok = await verifyPin(pin);
    setChecking(false);
    if (ok) {
      setPin("");
      markUnlocked(); // dispara re-leitura do store → esconde o overlay
    } else {
      setError(true);
      setPin("");
    }
  }

  if (!locked) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] grid place-items-center bg-[var(--color-surface)] p-6"
      role="dialog"
      aria-modal="true"
      aria-label="App bloqueado"
    >
      <div className="flex w-full max-w-xs flex-col items-center gap-5 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-accent/10 text-accent">
          <Lock className="size-6" />
        </span>
        <div>
          <h1 className="text-lg font-semibold text-ink">Minha Gestão</h1>
          <p className="mt-1 text-sm text-ink-soft">Digite seu PIN para desbloquear.</p>
        </div>
        <form onSubmit={submit} className="flex w-full flex-col gap-3">
          <input
            className="field text-center text-2xl tracking-[0.5em]"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            maxLength={8}
            value={pin}
            onChange={(e) => {
              setError(false);
              setPin(e.target.value.replace(/\D/g, ""));
            }}
            aria-label="PIN"
            aria-invalid={error}
          />
          {error && <p role="alert" className="text-sm text-neg">PIN incorreto. Tente novamente.</p>}
          <button
            type="submit"
            disabled={pin.length < 4 || checking}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          >
            {checking ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Desbloquear
          </button>
        </form>
      </div>
    </div>
  );
}
