"use client";

import { useEffect, useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useToast } from "@/components/ui/Toast";
import { clearPin, isLockEnabled, onLockChange, setPin as savePin, verifyPin } from "@/lib/lock";

type Mode = "idle" | "create" | "disable";

/** Configuração do bloqueio do app por PIN, na tela de Configurações. */
export function AppLockSettings() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<Mode>("idle");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const sync = () => setEnabled(isLockEnabled());
    sync();
    return onLockChange(sync);
  }, []);

  function resetForm() {
    setPin("");
    setPin2("");
    setErr("");
    setMode("idle");
  }

  async function handleCreate() {
    if (!/^\d{4,8}$/.test(pin)) {
      setErr("Use de 4 a 8 dígitos.");
      return;
    }
    if (pin !== pin2) {
      setErr("Os PINs não coincidem.");
      return;
    }
    setBusy(true);
    await savePin(pin);
    setBusy(false);
    toast("Bloqueio por PIN ativado.", "success");
    resetForm();
  }

  async function handleDisable() {
    setBusy(true);
    const ok = await verifyPin(pin);
    setBusy(false);
    if (!ok) {
      setErr("PIN incorreto.");
      return;
    }
    clearPin();
    toast("Bloqueio desativado.", "success");
    resetForm();
  }

  return (
    <GlassCard variant="liquid" className="col-span-12">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-accent/10 text-accent">
          {enabled ? <ShieldCheck className="size-5" /> : <Lock className="size-5" />}
        </span>
        <div>
          <h3 className="font-semibold text-ink">Bloqueio do app</h3>
          <p className="text-sm text-ink-muted">
            {enabled ? "Ativo — pede um PIN ao abrir o app." : "Proteja o acesso com um PIN ao abrir o app."}
          </p>
        </div>
      </div>

      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          {enabled ? (
            <>
              <button type="button" onClick={() => { setErr(""); setMode("create"); }} className="rounded-2xl border border-[var(--color-line)] px-4 py-2.5 text-sm font-semibold text-ink-soft hover:text-ink">Alterar PIN</button>
              <button type="button" onClick={() => { setErr(""); setMode("disable"); }} className="rounded-2xl border border-rose-400/30 px-4 py-2.5 text-sm font-semibold text-neg hover:bg-rose-500/10">Desativar</button>
            </>
          ) : (
            <button type="button" onClick={() => { setErr(""); setMode("create"); }} className="btn-primary">Ativar bloqueio por PIN</button>
          )}
        </div>
      )}

      {mode === "create" && (
        <div className="flex flex-col gap-3 sm:max-w-sm">
          <label className="field-label">Novo PIN (4–8 dígitos)
            <input className="field tracking-[0.3em]" type="password" inputMode="numeric" autoComplete="off" maxLength={8} value={pin} onChange={(e) => { setErr(""); setPin(e.target.value.replace(/\D/g, "")); }} autoFocus />
          </label>
          <label className="field-label">Confirmar PIN
            <input className="field tracking-[0.3em]" type="password" inputMode="numeric" autoComplete="off" maxLength={8} value={pin2} onChange={(e) => { setErr(""); setPin2(e.target.value.replace(/\D/g, "")); }} />
          </label>
          {err && <p role="alert" className="text-sm text-neg">{err}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => void handleCreate()} disabled={busy} className="btn-primary disabled:opacity-60">Salvar PIN</button>
            <button type="button" onClick={resetForm} className="rounded-2xl border border-[var(--color-line)] px-4 py-2.5 text-sm font-semibold text-ink-soft hover:text-ink">Cancelar</button>
          </div>
        </div>
      )}

      {mode === "disable" && (
        <div className="flex flex-col gap-3 sm:max-w-sm">
          <label className="field-label">Digite o PIN atual para desativar
            <input className="field tracking-[0.3em]" type="password" inputMode="numeric" autoComplete="off" maxLength={8} value={pin} onChange={(e) => { setErr(""); setPin(e.target.value.replace(/\D/g, "")); }} autoFocus />
          </label>
          {err && <p role="alert" className="text-sm text-neg">{err}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => void handleDisable()} disabled={busy || pin.length < 4} className="rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60">Desativar bloqueio</button>
            <button type="button" onClick={resetForm} className="rounded-2xl border border-[var(--color-line)] px-4 py-2.5 text-sm font-semibold text-ink-soft hover:text-ink">Cancelar</button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
