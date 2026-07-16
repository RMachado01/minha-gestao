"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Archive, Banknote, Check, LineChart, LoaderCircle, Pencil, X } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { MoneyInput, parseBRL } from "@/components/forms/MoneyInput";
import { SelectField } from "@/components/forms/SelectField";
import type { InvestmentPosition } from "@/lib/supabase/useInvestments";

type Tab = "dados" | "valor" | "provento" | "arquivar";

const TABS: Array<{ id: Tab; label: string; icon: typeof Pencil }> = [
  { id: "dados", label: "Dados", icon: Pencil },
  { id: "valor", label: "Atualizar valor", icon: LineChart },
  { id: "provento", label: "Provento", icon: Banknote },
  { id: "arquivar", label: "Arquivar", icon: Archive },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function InvestmentManageDialog({
  position,
  onClose,
  onChanged,
}: {
  position: InvestmentPosition | null;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<Tab>("dados");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [incomeType, setIncomeType] = useState<"dividendo" | "jcp" | "rendimento" | "juros" | "outro">("dividendo");

  function closeAndReset() {
    setTab("dados");
    setError("");
    onClose();
  }

  async function updateDados(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!position) return;
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setSaving(false);
      return;
    }
    const ticker = String(data.get("ticker") ?? "").trim();
    const maturityDate = String(data.get("maturity_date") ?? "").trim();
    const { error: updateError } = await supabase
      .from("investments")
      .update({
        name: String(data.get("name")).trim(),
        institution: String(data.get("institution")).trim(),
        ticker: ticker || null,
        maturity_date: maturityDate || null,
        notes: String(data.get("notes") ?? "").trim() || null,
      })
      .eq("id", position.id);
    if (updateError) {
      setError("Não foi possível atualizar os dados.");
      setSaving(false);
      return;
    }
    await onChanged();
    toast("Investimento atualizado.", "success");
    setSaving(false);
    closeAndReset();
  }

  async function addSnapshot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!position) return;
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    const value = parseBRL(data.get("current_value"));
    if (!Number.isFinite(value) || value < 0) {
      setError("Informe um valor válido.");
      setSaving(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setSaving(false);
      return;
    }
    const { error: insertError } = await supabase.from("investment_snapshots").insert({
      investment_id: position.id,
      snapshot_date: String(data.get("snapshot_date")) || todayISO(),
      current_value: value,
    });
    if (insertError) {
      setError("Não foi possível registrar o novo valor.");
      setSaving(false);
      return;
    }
    await onChanged();
    toast("Valor atualizado.", "success");
    setSaving(false);
    closeAndReset();
  }

  async function addIncome(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!position) return;
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    const amount = parseBRL(data.get("amount"));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Informe um valor válido.");
      setSaving(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setSaving(false);
      return;
    }
    const { error: insertError } = await supabase.from("investment_income").insert({
      investment_id: position.id,
      type: incomeType,
      amount,
      payment_date: String(data.get("payment_date")) || todayISO(),
      notes: String(data.get("notes") ?? "").trim() || null,
    });
    if (insertError) {
      setError(insertError.message.includes("investment_income") ? "Aplique a migration 202607170003 no Supabase antes de registrar proventos." : "Não foi possível registrar o provento.");
      setSaving(false);
      return;
    }
    await onChanged();
    toast("Provento registrado.", "success");
    setSaving(false);
    closeAndReset();
  }

  async function archivePosition() {
    if (!position) return;
    setSaving(true);
    setError("");
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setSaving(false);
      return;
    }
    const { error: archiveError } = await supabase.from("investments").update({ archived: true }).eq("id", position.id);
    if (archiveError) {
      setError("Não foi possível arquivar o investimento.");
      setSaving(false);
      return;
    }
    await onChanged();
    toast("Investimento arquivado. O histórico foi preservado.", "warning");
    setSaving(false);
    closeAndReset();
  }

  return (
    <AnimatePresence>
      {position && (
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
            aria-labelledby="investment-dialog-title"
            className="liquid-glass-hero relative my-auto w-full max-w-2xl rounded-[2rem] p-6 sm:p-8"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
          >
            <button type="button" onClick={closeAndReset} className="absolute right-5 top-5 rounded-xl p-2 text-ink-muted hover:bg-white/10 hover:text-ink" aria-label="Fechar"><X className="size-5" /></button>
            <div className="flex items-center gap-3 pr-12">
              <span className="grid size-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                <LineChart className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-accent">Gerenciar posição</p>
                <h2 id="investment-dialog-title" className="mt-1 text-xl font-semibold text-ink">{position.nome}</h2>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Ações da posição">
              {TABS.map(({ id, label, icon: Icon }) => (
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
              <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={updateDados}>
                <label className="field-label">Nome<input className="field" name="name" defaultValue={position.nome} minLength={2} required /></label>
                <label className="field-label">Instituição<input className="field" name="institution" defaultValue={position.instituicao} required /></label>
                <label className="field-label">Ticker<input className="field" name="ticker" defaultValue={position.ticker ?? ""} placeholder="Ex.: PETR4" /></label>
                <label className="field-label">Vencimento<input className="field" type="date" name="maturity_date" defaultValue={position.maturityDate ?? ""} /></label>
                <label className="field-label sm:col-span-2">Notas<textarea className="field" name="notes" rows={2} defaultValue={position.notes ?? ""} /></label>
                {error && <p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-sm text-neg sm:col-span-2">{error}</p>}
                <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
                  <button type="button" onClick={closeAndReset} className="rounded-2xl border border-[var(--color-line)] px-4 py-2.5 text-sm font-semibold text-ink-soft hover:text-ink">Cancelar</button>
                  <button className="btn-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar alterações</button>
                </div>
              </form>
            )}

            {tab === "valor" && (
              <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={addSnapshot}>
                <p className="text-sm text-ink-soft sm:col-span-2">Valor atual: <span className="tnum font-semibold text-ink">{position.atual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></p>
                <label className="field-label">Novo valor atual<MoneyInput name="current_value" defaultValue={position.atual} required /></label>
                <label className="field-label">Data<input className="field" type="date" name="snapshot_date" defaultValue={todayISO()} required /></label>
                {error && <p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-sm text-neg sm:col-span-2">{error}</p>}
                <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
                  <button type="button" onClick={closeAndReset} className="rounded-2xl border border-[var(--color-line)] px-4 py-2.5 text-sm font-semibold text-ink-soft hover:text-ink">Cancelar</button>
                  <button className="btn-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}Atualizar valor</button>
                </div>
              </form>
            )}

            {tab === "provento" && (
              <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={addIncome}>
                <label className="field-label">Tipo<SelectField value={incomeType} onChange={(event) => setIncomeType(event.target.value as typeof incomeType)}><option value="dividendo">Dividendo</option><option value="jcp">JCP</option><option value="rendimento">Rendimento</option><option value="juros">Juros</option><option value="outro">Outro</option></SelectField></label>
                <label className="field-label">Valor recebido<MoneyInput name="amount" required /></label>
                <label className="field-label">Data do pagamento<input className="field" type="date" name="payment_date" defaultValue={todayISO()} required /></label>
                <label className="field-label">Notas<input className="field" name="notes" placeholder="Opcional" /></label>
                {error && <p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-sm text-neg sm:col-span-2">{error}</p>}
                <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
                  <button type="button" onClick={closeAndReset} className="rounded-2xl border border-[var(--color-line)] px-4 py-2.5 text-sm font-semibold text-ink-soft hover:text-ink">Cancelar</button>
                  <button className="btn-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}Registrar provento</button>
                </div>
              </form>
            )}

            {tab === "arquivar" && (
              <div className="mt-6">
                <div className="flex gap-3 rounded-2xl bg-amber-400/10 p-4 text-sm leading-relaxed text-ink-soft"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn" /><p>A posição deixará de aparecer na carteira. Valores e proventos já registrados são preservados no histórico.</p></div>
                {error && <p role="alert" className="mt-4 rounded-xl bg-rose-400/10 p-3 text-sm text-neg">{error}</p>}
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button type="button" onClick={closeAndReset} className="rounded-2xl border border-[var(--color-line)] px-4 py-2.5 text-sm font-semibold text-ink-soft hover:text-ink">Cancelar</button>
                  <button type="button" onClick={() => void archivePosition()} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Archive className="size-4" />}Arquivar posição</button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
