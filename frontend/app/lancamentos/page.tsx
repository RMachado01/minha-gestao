"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, Check, CreditCard, LoaderCircle, Utensils } from "lucide-react";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { useCreditCards } from "@/lib/supabase/useCreditCards";

type Tipo = "expense" | "income" | "benefit";

const tipos = [
  { id: "expense" as const, label: "Despesa", icon: ArrowDownCircle, tone: "text-neg" },
  { id: "income" as const, label: "Receita", icon: ArrowUpCircle, tone: "text-pos" },
  { id: "benefit" as const, label: "VR / VA", icon: Utensils, tone: "text-warn" },
];

export default function LancamentosPage() {
  const today = new Date().toISOString().slice(0, 10);
  const { toast } = useToast();
  const { cards, loading: loadingCards, error: cardsError } = useCreditCards();
  const [tipo, setTipo] = useState<Tipo>("expense");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState("pix");
  const [selectedCardId, setSelectedCardId] = useState("");
  const selectedCard = cards.find((card) => card.id === selectedCardId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);
    setError("");

    if (tipo === "expense" && payment === "credit" && !selectedCardId) {
      setError("Selecione o cartão usado nesta compra.");
      setSaving(false);
      return;
    }

    const rawAmount = String(data.get("amount")).trim();
    const normalizedAmount = rawAmount.includes(",")
      ? rawAmount.replace(/\./g, "").replace(",", ".")
      : rawAmount;
    const amount = Number(normalizedAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Informe um valor válido maior que zero.");
      setSaving(false);
      return;
    }

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

    const { error: insertError } = await supabase.from("transactions").insert({
      user_id: authData.user.id,
      type: tipo,
      amount,
      occurred_on: String(data.get("date")),
      description: String(data.get("description")).trim(),
      category: tipo === "benefit" ? "Alimentação" : String(data.get("category")),
      payment_method: tipo === "benefit" ? "benefit" : tipo === "expense" ? payment : "pix",
      benefit_kind: tipo === "benefit" ? String(data.get("benefit")) : null,
      recurring: data.get("recurring") === "on",
      credit_card_id: tipo === "expense" && payment === "credit" ? selectedCardId : null,
      origin: tipo === "expense" ? "expense" : null,
      status: tipo === "expense" ? "pending" : "received",
      idempotency_key: crypto.randomUUID(),
    });

    if (insertError) {
      setError("Não foi possível salvar o lançamento. Tente novamente.");
      setSaving(false);
      return;
    }

    form.reset();
    setPayment("pix");
    setSelectedCardId("");
    setSaved(true);
    setSaving(false);
    toast("Lançamento salvo com sucesso!", "success");
    setTimeout(() => setSaved(false), 2500);
  }
  return (
    <section className="flex flex-col gap-6">
      <header><h2 className="text-2xl font-semibold text-ink">Novo lançamento</h2><p className="mt-1 text-sm text-ink-muted">Cadastre gastos, receitas e benefícios de alimentação.</p></header>
      <BentoGrid>
        <GlassCard variant="hero" className="col-span-12 p-6 lg:col-span-8 lg:p-7">
          <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[.16em] text-accent">Etapa 1</p><h3 className="mt-1 text-lg font-semibold text-ink">O que você deseja registrar?</h3></div>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Tipo do lançamento">
            {tipos.map(({ id, label, icon: Icon, tone }) => <button key={id} type="button" aria-pressed={tipo === id} onClick={() => setTipo(id)} className={`rounded-2xl border p-3 text-sm font-semibold transition ${tipo === id ? "border-accent bg-accent/10 text-ink" : "border-[var(--color-line)] text-ink-soft hover:bg-white/5"}`}><Icon className={`mx-auto mb-1 size-5 ${tone}`} />{label}</button>)}
          </div>
          <form className="mt-7 grid gap-x-5 gap-y-5 sm:grid-cols-2" onSubmit={submit}>
            <label className="field-label sm:col-span-2">Descrição<input className="field" name="description" placeholder={tipo === "benefit" ? "Ex.: Crédito mensal do vale-alimentação" : "Ex.: Compra no supermercado"} required /><span className="field-help">Use um nome que seja fácil de reconhecer no extrato.</span></label>
            <label className="field-label">Valor<MoneyInput name="amount" placeholder="0,00" required /></label>
            <label className="field-label">Data do lançamento<input className="field" name="date" type="date" defaultValue={today} required /></label>
            {tipo === "benefit" ? <label className="field-label">Categoria<input type="hidden" name="category" value="Alimentação" /><span className="field flex items-center bg-amber-400/10 text-warn">Alimentação · definida automaticamente</span></label> : <label className="field-label">Categoria<select className="field" name="category"><option>Alimentação</option><option>Moradia</option><option>Transporte</option><option>Saúde</option><option>Salário</option><option>Benefícios</option></select></label>}
            <label className="field-label">Conta ou carteira<select className="field" name="account"><option>Conta principal</option><option>Dinheiro</option><option>Vale-refeição</option><option>Vale-alimentação</option></select></label>
            {tipo === "benefit" && <label className="field-label">Tipo de benefício<select className="field" name="benefit"><option value="vr">VR — Vale-refeição</option><option value="va">VA — Vale-alimentação</option><option value="flex">VR/VA flexível</option></select></label>}
            {tipo === "expense" && <label className="field-label">Forma de pagamento<select className="field" name="payment" value={payment} onChange={(event) => setPayment(event.target.value)}><option value="pix">Débito / Pix</option><option value="credit">Cartão de crédito</option><option value="cash">Dinheiro</option><option value="benefit">VR / VA</option></select></label>}
            {tipo === "expense" && payment === "credit" && <div className="sm:col-span-2"><label className="field-label">Em qual cartão foi feita a compra?<select className="field" name="credit_card_id" required disabled={loadingCards || cards.length === 0} value={selectedCardId} onChange={(event) => setSelectedCardId(event.target.value)}><option value="">{loadingCards ? "Carregando seus cartões..." : cards.length === 0 ? "Nenhum cartão cadastrado" : "Selecione o cartão usado"}</option>{cards.map((card) => <option key={card.id} value={card.id}>{card.nickname} · {card.brand} · vence dia {card.due_day}</option>)}</select><span className="field-help">A despesa ficará vinculada ao cartão e será considerada na fatura correspondente.</span></label>{cardsError && <p className="mt-2 text-sm text-neg">{cardsError}</p>}{!loadingCards && cards.length === 0 && <Link href="/cartoes" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"><CreditCard className="size-4" />Cadastrar um cartão primeiro</Link>}{selectedCard && <div className="surface-card mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"><div className="flex items-center gap-3"><span className="size-3 rounded-full" style={{ background: selectedCard.color ?? "var(--color-accent)" }} /><div><p className="text-sm font-semibold text-ink">{selectedCard.nickname} · {selectedCard.brand}</p><p className="text-xs text-ink-muted">Fecha dia {selectedCard.closing_day} · vence dia {selectedCard.due_day}</p></div></div><div className="text-right"><p className="text-xs text-ink-muted">Fatura atual</p><p className="tnum text-sm font-semibold text-ink">{selectedCard.current_bill.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p><p className="mt-0.5 text-[11px] text-ink-muted">Limite {selectedCard.total_limit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div></div>}</div>}
            <label className="ios-glass flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm text-ink-soft sm:col-span-2"><input type="checkbox" name="recurring" className="size-4" /><span><strong className="block font-semibold text-ink">Repetir mensalmente</strong><span className="text-xs text-ink-muted">Cria uma recorrência que pode ser pausada depois.</span></span></label>
            {error && <p role="alert" className="rounded-2xl bg-rose-400/10 p-3 text-sm text-neg sm:col-span-2">{error}</p>}
            <button className="btn-primary sm:col-span-2" type="submit" disabled={saving}>{saving ? <><LoaderCircle className="size-4 animate-spin" />Salvando...</> : saved ? <><Check className="size-4" />Lançamento salvo</> : <><CreditCard className="size-4" />Salvar lançamento</>}</button>
          </form>
        </GlassCard>
        <GlassCard variant="liquid" className="col-span-12 lg:col-span-4">
          <h3 className="font-semibold text-ink">Como será registrado</h3>
          <div className="mt-5 space-y-4 text-sm"><div className="flex justify-between border-b border-[var(--color-line)] pb-3"><span className="text-ink-muted">Tipo</span><span className="font-medium text-ink">{tipos.find((item) => item.id === tipo)?.label}</span></div><div className="flex justify-between border-b border-[var(--color-line)] pb-3"><span className="text-ink-muted">Status inicial</span><span className="font-medium text-warn">Pendente</span></div><p className="rounded-2xl bg-accent/10 p-4 text-ink-soft">A API usará uma chave de idempotência para impedir lançamentos duplicados em caso de clique duplo ou reconexão.</p></div>
        </GlassCard>
      </BentoGrid>
    </section>
  );
}
