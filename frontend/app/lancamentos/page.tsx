"use client";

import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Check, CreditCard, Utensils } from "lucide-react";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { cartoes } from "@/lib/mock";

type Tipo = "expense" | "income" | "benefit";

const tipos = [
  { id: "expense" as const, label: "Despesa", icon: ArrowDownCircle, tone: "text-neg" },
  { id: "income" as const, label: "Receita", icon: ArrowUpCircle, tone: "text-pos" },
  { id: "benefit" as const, label: "VR / VA", icon: Utensils, tone: "text-warn" },
];

export default function LancamentosPage() {
  const [tipo, setTipo] = useState<Tipo>("expense");
  const [saved, setSaved] = useState(false);
  const [payment, setPayment] = useState("pix");
  return (
    <section className="flex flex-col gap-6">
      <header><h2 className="text-2xl font-semibold text-ink">Novo lançamento</h2><p className="mt-1 text-sm text-ink-muted">Cadastre gastos, receitas e benefícios de alimentação.</p></header>
      <BentoGrid>
        <GlassCard strong className="col-span-12 p-6 lg:col-span-8 lg:p-7">
          <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[.16em] text-accent">Etapa 1</p><h3 className="mt-1 text-lg font-semibold text-ink">O que você deseja registrar?</h3></div>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Tipo do lançamento">
            {tipos.map(({ id, label, icon: Icon, tone }) => <button key={id} type="button" aria-pressed={tipo === id} onClick={() => setTipo(id)} className={`rounded-2xl border p-3 text-sm font-semibold transition ${tipo === id ? "border-accent bg-indigo-500/10 text-ink" : "border-[var(--color-line)] text-ink-soft hover:bg-white/5"}`}><Icon className={`mx-auto mb-1 size-5 ${tone}`} />{label}</button>)}
          </div>
          <form className="mt-7 grid gap-x-5 gap-y-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 2500); }}>
            <label className="field-label sm:col-span-2">Descrição<input className="field" name="description" placeholder={tipo === "benefit" ? "Ex.: Crédito mensal do vale-alimentação" : "Ex.: Compra no supermercado"} required /><span className="field-help">Use um nome que seja fácil de reconhecer no extrato.</span></label>
            <label className="field-label">Valor (R$)<input className="field tnum text-lg font-semibold" name="amount" inputMode="decimal" placeholder="0,00" required /></label>
            <label className="field-label">Data do lançamento<input className="field" name="date" type="date" defaultValue="2026-07-11" required /></label>
            {tipo === "benefit" ? <label className="field-label">Categoria<input type="hidden" name="category" value="Alimentação" /><span className="field flex items-center bg-amber-400/10 text-warn">Alimentação · definida automaticamente</span></label> : <label className="field-label">Categoria<select className="field" name="category"><option>Alimentação</option><option>Moradia</option><option>Transporte</option><option>Saúde</option><option>Salário</option><option>Benefícios</option></select></label>}
            <label className="field-label">Conta ou carteira<select className="field" name="account"><option>Conta principal</option><option>Dinheiro</option><option>Vale-refeição</option><option>Vale-alimentação</option></select></label>
            {tipo === "benefit" && <label className="field-label">Tipo de benefício<select className="field" name="benefit"><option>VR — Vale-refeição</option><option>VA — Vale-alimentação</option><option>VR/VA flexível</option></select></label>}
            {tipo === "expense" && <label className="field-label">Forma de pagamento<select className="field" name="payment" value={payment} onChange={(event) => setPayment(event.target.value)}><option value="pix">Débito / Pix</option><option value="credit">Cartão de crédito</option><option value="cash">Dinheiro</option><option value="benefit">VR / VA</option></select></label>}
            {tipo === "expense" && payment === "credit" && <label className="field-label sm:col-span-2">Em qual cartão foi feita a compra?<select className="field" name="credit_card_id" required><option value="">Selecione um cartão cadastrado</option>{cartoes.map((card) => <option key={card.id} value={card.id}>{card.apelido} · {card.bandeira} · vence {card.vencimento}</option>)}</select><span className="field-help">A compra será incluída na fatura correta conforme fechamento e vencimento.</span></label>}
            <label className="ios-glass flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm text-ink-soft sm:col-span-2"><input type="checkbox" name="recurring" className="size-4" /><span><strong className="block font-semibold text-ink">Repetir mensalmente</strong><span className="text-xs text-ink-muted">Cria uma recorrência que pode ser pausada depois.</span></span></label>
            <button className="btn-primary sm:col-span-2" type="submit">{saved ? <><Check className="size-4" />Lançamento salvo</> : <><CreditCard className="size-4" />Salvar lançamento</>}</button>
          </form>
        </GlassCard>
        <GlassCard className="col-span-12 lg:col-span-4">
          <h3 className="font-semibold text-ink">Como será registrado</h3>
          <div className="mt-5 space-y-4 text-sm"><div className="flex justify-between border-b border-[var(--color-line)] pb-3"><span className="text-ink-muted">Tipo</span><span className="font-medium text-ink">{tipos.find((item) => item.id === tipo)?.label}</span></div><div className="flex justify-between border-b border-[var(--color-line)] pb-3"><span className="text-ink-muted">Status inicial</span><span className="font-medium text-warn">Pendente</span></div><p className="rounded-2xl bg-indigo-500/10 p-4 text-ink-soft">A API usará uma chave de idempotência para impedir lançamentos duplicados em caso de clique duplo ou reconexão.</p></div>
        </GlassCard>
      </BentoGrid>
    </section>
  );
}
