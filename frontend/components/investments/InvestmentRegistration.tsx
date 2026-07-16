"use client";

import { useState } from "react";
import { Check, LineChart, LoaderCircle, Plus, X } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { MoneyInput, parseBRL } from "@/components/forms/MoneyInput";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { INVESTMENT_TYPE_LABEL, type InvestmentType } from "@/lib/supabase/useInvestments";

const TYPE_KEYS = Object.keys(INVESTMENT_TYPE_LABEL) as InvestmentType[];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function InvestmentRegistration({ onSaved }: { onSaved?: () => void | Promise<void> }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<InvestmentType>("renda_fixa");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setSaving(false);
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setError("Sua sessão expirou. Entre novamente.");
      setSaving(false);
      return;
    }

    const investedAmount = parseBRL(data.get("invested_amount"));
    if (!Number.isFinite(investedAmount) || investedAmount <= 0) {
      setError("Informe um valor investido válido.");
      setSaving(false);
      return;
    }

    const applicationDate = String(data.get("application_date")) || todayISO();
    const ticker = String(data.get("ticker") ?? "").trim();
    const maturityDate = String(data.get("maturity_date") ?? "").trim();

    const { data: inserted, error: insertError } = await supabase
      .from("investments")
      .insert({
        user_id: authData.user.id,
        name: String(data.get("name")).trim(),
        type,
        invested_amount: investedAmount,
        application_date: applicationDate,
        institution: String(data.get("institution")).trim(),
        ticker: ticker || null,
        maturity_date: type === "renda_fixa" && maturityDate ? maturityDate : null,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      setError(
        insertError?.message.includes("ticker") || insertError?.message.includes("archived")
          ? "Aplique a migration 202607170003 no Supabase antes de cadastrar investimentos."
          : "Não foi possível salvar o investimento. Revise os dados e tente novamente.",
      );
      setSaving(false);
      return;
    }

    // Snapshot inicial: valor atual começa igual ao valor investido — a valorização
    // parte de zero até o usuário atualizar o valor mais tarde.
    const { error: snapshotError } = await supabase.from("investment_snapshots").insert({
      investment_id: inserted.id,
      snapshot_date: applicationDate,
      current_value: investedAmount,
    });
    if (snapshotError) {
      setError("Investimento salvo, mas não foi possível registrar o valor inicial.");
      setSaving(false);
      return;
    }

    setSaved(true);
    toast("Investimento cadastrado.", "success");
    form.reset();
    setType("renda_fixa");
    await onSaved?.();
    setTimeout(() => {
      setSaved(false);
      setOpen(false);
    }, 1200);
    setSaving(false);
  }

  return (
    <div>
      <button type="button" onClick={() => setOpen((value) => !value)} className="btn-primary min-h-11">
        {open ? <X className="size-4" /> : <Plus className="size-4" />}
        {open ? "Fechar cadastro" : "Cadastrar investimento"}
      </button>
      {open && (
        <GlassCard variant="hero" className="mt-4 p-5 sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Nova posição</p>
            <h3 className="mt-1 text-lg font-semibold text-ink">Adicionar à carteira</h3>
            <p className="mt-1 text-sm text-ink-muted">O valor atual começa igual ao investido — atualize depois em &quot;Gerenciar&quot; conforme o mercado se mover.</p>
          </div>

          <div className="mb-5 grid grid-cols-5 gap-2" role="group" aria-label="Tipo de investimento">
            {TYPE_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={type === key}
                onClick={() => setType(key)}
                className={`rounded-2xl border p-2.5 text-xs font-semibold transition ${type === key ? "border-accent bg-accent/10 text-ink" : "border-[var(--color-line)] text-ink-soft"}`}
              >
                {INVESTMENT_TYPE_LABEL[key]}
              </button>
            ))}
          </div>

          <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={submit}>
            <label className="field-label">Nome<input className="field" name="name" placeholder="Ex.: Tesouro Selic 2029" required /></label>
            <label className="field-label">Instituição<input className="field" name="institution" placeholder="Ex.: XP, Nubank, Binance" required /></label>
            <label className="field-label">Valor investido<MoneyInput name="invested_amount" required /></label>
            <label className="field-label">Data da aplicação<input className="field" type="date" name="application_date" defaultValue={todayISO()} required /></label>
            {(type === "renda_variavel" || type === "cripto") && (
              <label className="field-label">Ticker<input className="field" name="ticker" placeholder="Ex.: PETR4" /></label>
            )}
            {type === "renda_fixa" && (
              <label className="field-label">Vencimento<input className="field" type="date" name="maturity_date" /></label>
            )}

            {error && <p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-sm text-neg sm:col-span-2 lg:col-span-4">{error}</p>}
            <button className="btn-primary sm:col-span-2 lg:self-end" type="submit" disabled={saving}>
              {saving ? <><LoaderCircle className="size-4 animate-spin" />Salvando...</> : saved ? <><Check className="size-4" />Investimento cadastrado</> : <><LineChart className="size-4" />Salvar investimento</>}
            </button>
          </form>
        </GlassCard>
      )}
    </div>
  );
}
