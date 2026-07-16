"use client";

import { useState } from "react";
import { Check, CreditCard, LoaderCircle, Plus, Utensils, X } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { CardBrandMark } from "@/components/cards/CardBrandMark";
import { MoneyInput, parseBRL } from "@/components/forms/MoneyInput";
import { SelectField } from "@/components/forms/SelectField";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { BANKS, BENEFIT_OPERATORS, CARD_BRANDS, getBrand } from "@/lib/brands";

type CardType = "credit" | "benefit";
type BenefitMode = "separate" | "flex";

export function CardRegistration({ onSaved }: { onSaved?: () => void | Promise<void> }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [cardType, setCardType] = useState<CardType>("credit");
  const [benefitMode, setBenefitMode] = useState<BenefitMode>("separate");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [brand, setBrand] = useState("Mastercard");
  const [bank, setBank] = useState("Nubank");
  const [benefitOperator, setBenefitOperator] = useState("Alelo");
  const [nickname, setNickname] = useState("");
  const bankIdentity = getBrand(BANKS, bank);
  const benefitIdentity = getBrand(BENEFIT_OPERATORS, benefitOperator);
  const isBenefit = cardType === "benefit";
  const previewColor = isBenefit ? benefitIdentity.color : bankIdentity.color;

  function resetForm() {
    setBrand("Mastercard");
    setBank("Nubank");
    setBenefitOperator("Alelo");
    setNickname("");
  }

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

    const payload = {
      user_id: authData.user.id,
      nickname: String(data.get("nickname")).trim(),
      brand: isBenefit ? benefitOperator : String(data.get("brand")),
      bank: isBenefit ? null : String(data.get("bank")),
      total_limit: isBenefit ? 0 : parseBRL(data.get("limit")),
      color: isBenefit ? benefitIdentity.color : String(data.get("color")),
      closing_day: isBenefit ? 1 : Number(data.get("closing_day")),
      due_day: isBenefit ? 1 : Number(data.get("due_day")),
      active: true,
      card_type: cardType,
      benefit_mode: isBenefit ? benefitMode : null,
      vr_balance: isBenefit && benefitMode === "separate" ? parseBRL(data.get("vr_balance")) || 0 : 0,
      va_balance: isBenefit && benefitMode === "separate" ? parseBRL(data.get("va_balance")) || 0 : 0,
      flex_balance: isBenefit && benefitMode === "flex" ? parseBRL(data.get("flex_balance")) || 0 : 0,
    };

    if (!isBenefit && (!Number.isFinite(payload.total_limit) || payload.total_limit < 0)) {
      setError("Informe um limite válido.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("credit_cards").insert(payload);
    if (insertError) {
      setError(insertError.message.includes("card_type") ? "Aplique a migration 202607170001 no Supabase antes de cadastrar VR/VA." : "Não foi possível salvar o cartão. Revise os dados e tente novamente.");
      setSaving(false);
      return;
    }

    setSaved(true);
    toast(isBenefit ? "Cartão alimentação cadastrado." : "Cartão de crédito cadastrado.", "success");
    form.reset();
    resetForm();
    await onSaved?.();
    setTimeout(() => {
      setSaved(false);
      setOpen(false);
    }, 1200);
    setSaving(false);
  }

  return (
    <div data-tour="card-registration">
      <button type="button" onClick={() => setOpen((value) => !value)} className="btn-primary min-h-11">
        {open ? <X className="size-4" /> : <Plus className="size-4" />}
        {open ? "Fechar cadastro" : "Cadastrar cartão"}
      </button>
      {open && (
        <GlassCard variant="hero" className="mt-4 p-5 sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Novo cartão</p>
            <h3 className="mt-1 text-lg font-semibold text-ink">Crédito ou alimentação</h3>
            <p className="mt-1 text-sm text-ink-muted">Cadastre somente dados de controle. Nunca informe número completo, CVV ou senha.</p>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2" role="group" aria-label="Tipo de cartão">
            <button type="button" aria-pressed={cardType === "credit"} onClick={() => setCardType("credit")} className={`rounded-2xl border p-3 text-sm font-semibold transition ${cardType === "credit" ? "border-accent bg-accent/10 text-ink" : "border-[var(--color-line)] text-ink-soft"}`}><CreditCard className="mx-auto mb-1 size-5" />Crédito</button>
            <button type="button" aria-pressed={isBenefit} onClick={() => setCardType("benefit")} className={`rounded-2xl border p-3 text-sm font-semibold transition ${isBenefit ? "border-accent bg-accent/10 text-ink" : "border-[var(--color-line)] text-ink-soft"}`}><Utensils className="mx-auto mb-1 size-5" />VR / VA</button>
          </div>

          {/* Preview ao vivo — reflete bandeira/operadora e banco escolhidos */}
          <div
            className="relative mb-5 flex h-24 items-center justify-between overflow-hidden rounded-2xl p-4"
            style={{
              background: `linear-gradient(135deg, color-mix(in oklab, ${previewColor} 60%, #080c16), color-mix(in oklab, ${previewColor} 20%, #080c16))`,
              border: `1px solid color-mix(in oklab, ${previewColor} 45%, transparent)`,
            }}
          >
            <div>
              <p className="text-sm font-semibold text-white">{nickname || "Apelido do cartão"}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-white/70">{isBenefit ? "VR / VA" : bankIdentity.label}</p>
            </div>
            {isBenefit ? (
              <span className="text-sm font-bold tracking-tight text-white/95">{benefitIdentity.label}</span>
            ) : (
              <CardBrandMark brand={brand} />
            )}
          </div>

          <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={submit}>
            <label className="field-label">Apelido<input className="field" name="nickname" placeholder={isBenefit ? "Ex.: Vale alimentação" : "Ex.: Cartão principal"} value={nickname} onChange={(event) => setNickname(event.target.value)} required /></label>

            {isBenefit ? (
              <label className="field-label">Operadora<SelectField name="brand" value={benefitOperator} onChange={(event) => setBenefitOperator(event.target.value)}>{Object.keys(BENEFIT_OPERATORS).map((key) => <option key={key} value={key}>{BENEFIT_OPERATORS[key].label}</option>)}</SelectField></label>
            ) : (
              <>
                <label className="field-label">Bandeira<select className="field" name="brand" value={brand} onChange={(event) => setBrand(event.target.value)}>{Object.keys(CARD_BRANDS).map((key) => <option key={key} value={key}>{key}</option>)}</select></label>
                <label className="field-label">Banco<select className="field" name="bank" value={bank} onChange={(event) => setBank(event.target.value)}>{Object.keys(BANKS).map((key) => <option key={key} value={key}>{BANKS[key].label}</option>)}</select></label>
              </>
            )}

            {cardType === "credit" ? <>
              <label className="field-label">Limite total<MoneyInput name="limit" required /></label>
              <label className="field-label">Cor alternativa<select className="field" name="color"><option value="#006b3f">Verde escuro</option><option value="#00a86b">Verde claro</option><option value="#34d399">Esmeralda</option><option value="#60a5fa">Azul</option></select><span className="field-help">Usada só se o banco escolhido não tiver identidade cadastrada.</span></label>
              <label className="field-label">Dia de fechamento<input className="field" type="number" min="1" max="31" name="closing_day" required /></label>
              <label className="field-label">Dia de vencimento<input className="field" type="number" min="1" max="31" name="due_day" required /></label>
            </> : <>
              <label className="field-label">Organização do saldo<SelectField value={benefitMode} onChange={(event) => setBenefitMode(event.target.value as BenefitMode)}><option value="separate">VR e VA separados</option><option value="flex">Saldo flexível</option></SelectField></label>
              {benefitMode === "separate" ? <>
                <label className="field-label">Saldo VR<MoneyInput name="vr_balance" /></label>
                <label className="field-label">Saldo VA<MoneyInput name="va_balance" /></label>
              </> : <label className="field-label">Saldo flexível<MoneyInput name="flex_balance" /></label>}
              <p className="rounded-2xl bg-amber-400/10 p-3 text-xs leading-5 text-ink-soft sm:col-span-2 lg:col-span-4">Compras lançadas nesse cartão serão despesas de Alimentação e reduzirão o saldo automaticamente.</p>
            </>}

            {error && <p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-sm text-neg sm:col-span-2 lg:col-span-4">{error}</p>}
            <button className="btn-primary sm:col-span-2 lg:self-end" type="submit" disabled={saving}>
              {saving ? <><LoaderCircle className="size-4 animate-spin" />Salvando...</> : saved ? <><Check className="size-4" />Cartão cadastrado</> : <><CreditCard className="size-4" />Salvar cartão</>}
            </button>
          </form>
        </GlassCard>
      )}
    </div>
  );
}
