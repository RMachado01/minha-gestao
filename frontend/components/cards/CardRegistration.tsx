"use client";

import { useState } from "react";
import { Check, CreditCard, LoaderCircle, Plus, X } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { CardBrandMark } from "@/components/cards/CardBrandMark";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { BANKS, CARD_BRANDS, getBrand } from "@/lib/brands";

export function CardRegistration({ onSaved }: { onSaved?: () => void | Promise<void> }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [brand, setBrand] = useState("Mastercard");
  const [bank, setBank] = useState("Nubank");
  const [nickname, setNickname] = useState("");
  const bankIdentity = getBrand(BANKS, bank);

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

    const { error: insertError } = await supabase.from("credit_cards").insert({
      user_id: authData.user.id,
      nickname: String(data.get("nickname")).trim(),
      brand: String(data.get("brand")),
      bank: String(data.get("bank")),
      total_limit: Number(data.get("limit")),
      color: String(data.get("color")),
      closing_day: Number(data.get("closing_day")),
      due_day: Number(data.get("due_day")),
      active: true,
    });

    if (insertError) {
      setError("Não foi possível salvar o cartão. Revise os dados e tente novamente.");
      setSaving(false);
      return;
    }

    setSaved(true);
    toast("Cartão cadastrado com sucesso.", "success");
    form.reset();
    setBrand("Mastercard");
    setBank("Nubank");
    setNickname("");
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
        {open ? "Fechar cadastro" : "Cadastrar cartão"}
      </button>
      {open && (
        <GlassCard variant="hero" className="mt-4 p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Novo cartão</p>
            <h3 className="mt-1 text-lg font-semibold text-ink">Dados do cartão de crédito</h3>
            <p className="mt-1 text-sm text-ink-muted">Não informe número completo, CVV ou senha. Apenas dados de controle financeiro.</p>
          </div>
          {/* Preview ao vivo — reflete bandeira e banco escolhidos */}
          <div
            className="relative mb-5 flex h-24 items-center justify-between overflow-hidden rounded-2xl p-4"
            style={{
              background: `linear-gradient(135deg, color-mix(in oklab, ${bankIdentity.color} 60%, #080c16), color-mix(in oklab, ${bankIdentity.color} 20%, #080c16))`,
              border: `1px solid color-mix(in oklab, ${bankIdentity.color} 45%, transparent)`,
            }}
          >
            <div>
              <p className="text-sm font-semibold text-white">{nickname || "Apelido do cartão"}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-white/70">{bankIdentity.label}</p>
            </div>
            <CardBrandMark brand={brand} />
          </div>
          <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={submit}>
            <label className="field-label">Apelido<input className="field" name="nickname" placeholder="Ex.: Cartão principal" value={nickname} onChange={(event) => setNickname(event.target.value)} required /></label>
            <label className="field-label">Bandeira<select className="field" name="brand" value={brand} onChange={(event) => setBrand(event.target.value)}>{Object.keys(CARD_BRANDS).map((key) => <option key={key} value={key}>{key}</option>)}</select></label>
            <label className="field-label">Banco<select className="field" name="bank" value={bank} onChange={(event) => setBank(event.target.value)}>{Object.keys(BANKS).map((key) => <option key={key} value={key}>{BANKS[key].label}</option>)}</select></label>
            <label className="field-label">Limite total (R$)<input className="field tnum" type="number" min="0" step="0.01" name="limit" required /></label>
            <label className="field-label">Cor alternativa<select className="field" name="color"><option value="#006b3f">Verde escuro</option><option value="#00a86b">Verde claro</option><option value="#34d399">Esmeralda</option><option value="#60a5fa">Azul</option></select><span className="field-help">Usada só se o banco escolhido não tiver identidade cadastrada.</span></label>
            <label className="field-label">Dia de fechamento<input className="field" type="number" min="1" max="31" name="closing_day" required /></label>
            <label className="field-label">Dia de vencimento<input className="field" type="number" min="1" max="31" name="due_day" required /></label>
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
