"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Check, LoaderCircle, Pencil, Repeat, Trash2, X } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { MoneyInput, parseBRL } from "@/components/forms/MoneyInput";
import type { RecurrenceRule } from "@/lib/supabase/useRecurrences";

type Tab = "dados" | "excluir";

export function RecurrenceManageDialog({
  rule,
  onClose,
  onChanged,
  onRaise,
}: {
  rule: RecurrenceRule | null;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
  onRaise: (message: string) => void;
}) {
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<Tab>("dados");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(rule?.active ?? true);

  function closeAndReset() {
    setTab("dados");
    setError("");
    onClose();
  }

  async function updateRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rule) return;
    const data = new FormData(event.currentTarget);
    const amount = parseBRL(data.get("amount"));
    const dayOfMonth = Number(data.get("day_of_month"));
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      setError("Revise o valor e o dia informados.");
      return;
    }
    setSaving(true);
    setError("");
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setSaving(false);
      return;
    }
    const { error: updateError } = await supabase
      .from("recurrence_rules")
      .update({
        description: String(data.get("description")).trim(),
        amount,
        day_of_month: dayOfMonth,
        active,
      })
      .eq("id", rule.id);
    if (updateError) {
      setError("Não foi possível atualizar a recorrência.");
      setSaving(false);
      return;
    }
    await onChanged();
    toast("Recorrência atualizada.", "success");
    const isRaise = rule.type === "income" && amount > rule.amount;
    setSaving(false);
    closeAndReset();
    if (isRaise) {
      onRaise("Parabéns pelo aumento! Um passo mais próximo da sua independência.");
    }
  }

  async function deleteRule() {
    if (!rule) return;
    setSaving(true);
    setError("");
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setSaving(false);
      return;
    }
    const { error: deleteError } = await supabase.from("recurrence_rules").delete().eq("id", rule.id);
    if (deleteError) {
      setError("Não foi possível excluir a recorrência.");
      setSaving(false);
      return;
    }
    await onChanged();
    toast("Recorrência excluída.", "warning");
    setSaving(false);
    closeAndReset();
  }

  return (
    <AnimatePresence>
      {rule && (
        <motion.div
          className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-md"
          data-lenis-prevent
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="recurrence-dialog-title"
            className="liquid-glass-hero relative my-auto w-full max-w-xl rounded-[2rem] p-6 sm:p-8"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
          >
            <button type="button" onClick={closeAndReset} className="absolute right-5 top-5 rounded-xl p-2 text-ink-muted hover:bg-white/10 hover:text-ink" aria-label="Fechar"><X className="size-5" /></button>
            <div className="flex items-center gap-3 pr-12">
              <span className="grid size-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                <Repeat className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-accent">Gerenciar recorrência</p>
                <h2 id="recurrence-dialog-title" className="mt-1 text-xl font-semibold text-ink">{rule.description}</h2>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Ações da recorrência">
              {([
                { id: "dados" as const, label: "Editar", icon: Pencil },
                { id: "excluir" as const, label: "Excluir", icon: Trash2 },
              ]).map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setError(""); }} className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${tab === id ? "border-accent bg-accent/10 text-ink" : "border-[var(--color-line)] text-ink-soft hover:text-ink"}`}>
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {tab === "dados" && (
              <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={updateRule}>
                <label className="field-label sm:col-span-2">Descrição<input className="field" name="description" defaultValue={rule.description} minLength={2} required /></label>
                <label className="field-label">{rule.type === "income" ? "Valor recebido" : "Valor"}<MoneyInput name="amount" defaultValue={rule.amount} required /></label>
                <label className="field-label">{rule.type === "income" ? "Dia do pagamento" : "Dia de vencimento"}<input className="field tnum" type="number" name="day_of_month" min={1} max={31} defaultValue={rule.day_of_month} required /></label>
                <label className="ios-glass flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm text-ink-soft sm:col-span-2"><input type="checkbox" className="size-4" checked={active} onChange={(event) => setActive(event.target.checked)} /><span><strong className="block font-semibold text-ink">Recorrência ativa</strong><span className="text-xs text-ink-muted">Desmarque para pausar sem perder o histórico.</span></span></label>
                {error && <p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-sm text-neg sm:col-span-2">{error}</p>}
                <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
                  <button type="button" onClick={closeAndReset} className="rounded-2xl border border-[var(--color-line)] px-4 py-2.5 text-sm font-semibold text-ink-soft hover:text-ink">Cancelar</button>
                  <button className="btn-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar alterações</button>
                </div>
              </form>
            )}

            {tab === "excluir" && (
              <div className="mt-6">
                <div className="flex gap-3 rounded-2xl bg-amber-400/10 p-4 text-sm leading-relaxed text-ink-soft"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn" /><p>Essa recorrência será removida definitivamente. Lançamentos já criados a partir dela não são apagados.</p></div>
                {error && <p role="alert" className="mt-4 rounded-xl bg-rose-400/10 p-3 text-sm text-neg">{error}</p>}
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button type="button" onClick={closeAndReset} className="rounded-2xl border border-[var(--color-line)] px-4 py-2.5 text-sm font-semibold text-ink-soft hover:text-ink">Cancelar</button>
                  <button type="button" onClick={() => void deleteRule()} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}Excluir recorrência</button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
