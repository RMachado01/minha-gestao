"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Check, LoaderCircle, Pencil, Target, Trash2, X } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { MoneyInput, parseBRL } from "@/components/forms/MoneyInput";
import { SelectField } from "@/components/forms/SelectField";
import { GOAL_TYPES, type ContributionMode, type FinancialGoal } from "@/lib/goals";

type Tab = "dados" | "excluir";

export function GoalManageDialog({
  goal,
  onClose,
  onChanged,
}: {
  goal: FinancialGoal | null;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<Tab>("dados");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [contributionMode, setContributionMode] = useState<ContributionMode>(goal?.contribution_mode ?? "fixed");

  function closeAndReset() {
    setTab("dados");
    setError("");
    onClose();
  }

  async function updateGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!goal) return;
    const data = new FormData(event.currentTarget);
    const targetAmount = parseBRL(data.get("target_amount"));
    const contributionValue = parseBRL(data.get("contribution_value"));
    if (!Number.isFinite(targetAmount) || targetAmount <= 0 || !Number.isFinite(contributionValue) || contributionValue <= 0) {
      setError("Revise os valores da meta e do aporte.");
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
      .from("financial_goals")
      .update({
        name: String(data.get("name")).trim(),
        goal_type: String(data.get("goal_type")),
        description: String(data.get("description") ?? "").trim() || null,
        target_amount: targetAmount,
        contribution_mode: contributionMode,
        contribution_value: contributionValue,
        target_date: String(data.get("target_date") ?? "") || null,
      })
      .eq("id", goal.id);
    if (updateError) {
      setError("Não foi possível atualizar a meta.");
      setSaving(false);
      return;
    }
    await onChanged();
    toast("Meta atualizada.", "success");
    setSaving(false);
    closeAndReset();
  }

  async function cancelGoal() {
    if (!goal) return;
    setSaving(true);
    setError("");
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setSaving(false);
      return;
    }
    const { error: cancelError } = await supabase.from("financial_goals").update({ status: "cancelled" }).eq("id", goal.id);
    if (cancelError) {
      setError("Não foi possível excluir a meta.");
      setSaving(false);
      return;
    }
    await onChanged();
    toast("Meta excluída. O histórico de aportes foi preservado.", "warning");
    setSaving(false);
    closeAndReset();
  }

  return (
    <AnimatePresence>
      {goal && (
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
            aria-labelledby="goal-dialog-title"
            className="liquid-glass-hero relative my-auto w-full max-w-2xl rounded-[2rem] p-6 sm:p-8"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
          >
            <button type="button" onClick={closeAndReset} className="absolute right-5 top-5 rounded-xl p-2 text-ink-muted hover:bg-white/10 hover:text-ink" aria-label="Fechar"><X className="size-5" /></button>
            <div className="flex items-center gap-3 pr-12">
              <span className="grid size-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                <Target className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-accent">Gerenciar meta</p>
                <h2 id="goal-dialog-title" className="mt-1 text-xl font-semibold text-ink">{goal.name}</h2>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Ações da meta">
              {([
                { id: "dados" as const, label: "Editar", icon: Pencil },
                { id: "excluir" as const, label: "Excluir", icon: Trash2 },
              ]).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => { setTab(id); setError(""); }}
                  className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${tab === id ? "border-accent bg-accent/10 text-ink" : "border-[var(--color-line)] text-ink-soft hover:text-ink"}`}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {tab === "dados" && (
              <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={updateGoal}>
                <label className="field-label sm:col-span-2">Nome da meta<input className="field" name="name" defaultValue={goal.name} minLength={2} maxLength={80} required /></label>
                <label className="field-label">Tipo<SelectField name="goal_type" defaultValue={goal.goal_type}>{GOAL_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</SelectField></label>
                <label className="field-label">Data desejada<input className="field" type="date" name="target_date" defaultValue={goal.target_date ?? ""} /></label>
                <label className="field-label">Valor desejado<MoneyInput name="target_amount" defaultValue={goal.target_amount} required /></label>
                <label className="field-label">
                  {contributionMode === "fixed" ? "Aporte mensal" : "Percentual da renda"}
                  {contributionMode === "fixed"
                    ? <MoneyInput name="contribution_value" defaultValue={goal.contribution_value} required />
                    : <span className="relative"><input className="field field-with-suffix tnum" name="contribution_value" type="number" min="0.01" max="100" step="0.01" defaultValue={goal.contribution_value} required /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-ink-muted">%</span></span>}
                </label>
                <fieldset className="sm:col-span-2">
                  <legend className="field-label mb-2">Como deseja separar dinheiro?</legend>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" aria-pressed={contributionMode === "fixed"} onClick={() => setContributionMode("fixed")} className={`rounded-2xl border p-3 text-sm font-semibold ${contributionMode === "fixed" ? "border-accent bg-accent/10 text-ink" : "border-[var(--color-line)] text-ink-soft"}`}>Valor fixo mensal</button>
                    <button type="button" aria-pressed={contributionMode === "percentage"} onClick={() => setContributionMode("percentage")} className={`rounded-2xl border p-3 text-sm font-semibold ${contributionMode === "percentage" ? "border-accent bg-accent/10 text-ink" : "border-[var(--color-line)] text-ink-soft"}`}>% da renda mensal</button>
                  </div>
                </fieldset>
                <label className="field-label sm:col-span-2">Descrição<textarea className="field min-h-20 resize-y" name="description" maxLength={600} defaultValue={goal.description ?? ""} /></label>
                {error && <p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-sm text-neg sm:col-span-2">{error}</p>}
                <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
                  <button type="button" onClick={closeAndReset} className="rounded-2xl border border-[var(--color-line)] px-4 py-2.5 text-sm font-semibold text-ink-soft hover:text-ink">Cancelar</button>
                  <button className="btn-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar alterações</button>
                </div>
              </form>
            )}

            {tab === "excluir" && (
              <div className="mt-6">
                <div className="flex gap-3 rounded-2xl bg-amber-400/10 p-4 text-sm leading-relaxed text-ink-soft"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn" /><p>A meta deixará de aparecer na lista. Os aportes, retiradas e lançamentos já registrados são preservados no histórico.</p></div>
                {error && <p role="alert" className="mt-4 rounded-xl bg-rose-400/10 p-3 text-sm text-neg">{error}</p>}
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button type="button" onClick={closeAndReset} className="rounded-2xl border border-[var(--color-line)] px-4 py-2.5 text-sm font-semibold text-ink-soft hover:text-ink">Cancelar</button>
                  <button type="button" onClick={() => void cancelGoal()} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}Excluir meta</button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
