"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDownCircle, ArrowRight, ArrowUpCircle, Check, CheckCircle2, CreditCard, LoaderCircle, Plus, Sparkles, Utensils } from "lucide-react";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { SelectField } from "@/components/forms/SelectField";
import { useToast } from "@/components/ui/Toast";
import { BrandBadge } from "@/components/ui/BrandBadge";
import { createClient } from "@/lib/supabase/client";
import { useCreditCards } from "@/lib/supabase/useCreditCards";
import { BENEFIT_OPERATORS, CARD_BRANDS, getBrand } from "@/lib/brands";

type Tipo = "expense" | "income" | "benefit";

const tipos = [
  { id: "expense" as const, label: "Despesa", icon: ArrowDownCircle, tone: "text-neg" },
  { id: "income" as const, label: "Receita", icon: ArrowUpCircle, tone: "text-pos" },
  { id: "benefit" as const, label: "VR / VA", icon: Utensils, tone: "text-warn" },
];

interface CategoryRecord { id: string; name: string; type: "income" | "expense" }
const BASE_CATEGORIES = {
  expense: ["Alimentação", "Moradia", "Transporte", "Saúde", "Lazer", "Educação", "Assinatura"],
  income: ["Salário", "Freelance", "Rendimentos", "Benefícios", "Outros"],
} as const;

export default function LancamentosPage() {
  const today = new Date().toISOString().slice(0, 10);
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { toast } = useToast();
  const { cards, loading: loadingCards, error: cardsError } = useCreditCards();
  const [tipo, setTipo] = useState<Tipo>("expense");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState("pix");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [benefitOperator, setBenefitOperator] = useState("Alelo");
  const [recurring, setRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<"subscription" | "fixed_bill" | "installment">("subscription");
  const [dueDay, setDueDay] = useState(Number(today.slice(8, 10)));
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Alimentação");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [lastTransaction, setLastTransaction] = useState<{ id: string; description: string; amount: number } | null>(null);
  const selectedCard = cards.find((card) => card.id === selectedCardId);
  const categoryType = tipo === "income" ? "income" : "expense";
  const categoryOptions = useMemo(() => {
    const names = [...BASE_CATEGORIES[categoryType], ...categories.filter((item) => item.type === categoryType).map((item) => item.name)];
    return [...new Set(names)];
  }, [categories, categoryType]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data } = await supabase.from("categories").select("id,name,type").order("name");
      if (data) setCategories(data as CategoryRecord[]);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function chooseType(nextType: Tipo) {
    setTipo(nextType);
    setPayment("pix");
    setSelectedCardId("");
    setShowCategoryForm(false);
    setCategoryError("");
    setSelectedCategoryId(null);
    setSelectedCategory(nextType === "income" ? "Salário" : "Alimentação");
  }

  function chooseCategory(name: string) {
    setSelectedCategory(name);
    setSelectedCategoryId(categories.find((item) => item.name === name && item.type === categoryType)?.id ?? null);
  }

  async function createCategory() {
    const name = newCategoryName.trim();
    if (name.length < 2) {
      setCategoryError("Digite um nome com pelo menos 2 caracteres.");
      return;
    }
    const existing = categories.find((item) => item.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR") && item.type === categoryType);
    if (existing) {
      chooseCategory(existing.name);
      setShowCategoryForm(false);
      setNewCategoryName("");
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    setSavingCategory(true);
    setCategoryError("");
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setCategoryError("Sua sessão expirou. Entre novamente.");
      setSavingCategory(false);
      return;
    }
    const { data: created, error: createError } = await supabase.from("categories").insert({
      user_id: authData.user.id,
      name,
      type: categoryType,
      color: null,
      icon: null,
    }).select("id,name,type").single();
    if (createError || !created) {
      setCategoryError("Não foi possível criar a categoria.");
    } else {
      const category = created as CategoryRecord;
      setCategories((current) => [...current, category]);
      setSelectedCategory(category.name);
      setSelectedCategoryId(category.id);
      setNewCategoryName("");
      setShowCategoryForm(false);
      toast(`Categoria “${category.name}” criada.`, "success");
    }
    setSavingCategory(false);
  }

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

    let recurrenceId: string | null = null;
    if (recurring) {
      const { data: rule, error: ruleError } = await supabase.from("recurrence_rules").insert({
        user_id: authData.user.id,
        description: String(data.get("description")).trim(),
        type: recurrenceType,
        amount,
        day_of_month: dueDay,
        start_date: String(data.get("date")),
        category_id: tipo === "benefit" ? null : selectedCategoryId,
        active: true,
      }).select("id").single();
      if (ruleError || !rule) {
        setError("Não foi possível criar a recorrência. Tente novamente.");
        setSaving(false);
        return;
      }
      recurrenceId = rule.id;
    }

    const description = String(data.get("description")).trim();
    const { data: inserted, error: insertError } = await supabase.from("transactions").insert({
      user_id: authData.user.id,
      type: tipo,
      amount,
      occurred_on: String(data.get("date")),
      description,
      category: tipo === "benefit" ? "Alimentação" : String(data.get("category")),
      category_id: tipo === "benefit" ? null : selectedCategoryId,
      payment_method: tipo === "benefit" ? "benefit" : tipo === "expense" ? payment : "pix",
      benefit_kind: tipo === "benefit" ? String(data.get("benefit")) : null,
      benefit_operator: tipo === "benefit" ? String(data.get("benefit_operator")) : null,
      recurring,
      recurrence_id: recurrenceId,
      credit_card_id: tipo === "expense" && payment === "credit" ? selectedCardId : null,
      origin: tipo === "expense" ? (recurring ? "recurring_expense" : "expense") : null,
      status: tipo === "expense" ? "pending" : "received",
      idempotency_key: crypto.randomUUID(),
    }).select("id").single();

    if (insertError || !inserted) {
      setError("Não foi possível salvar o lançamento. Tente novamente.");
      setSaving(false);
      return;
    }

    form.reset();
    setPayment("pix");
    setSelectedCardId("");
    setRecurring(false);
    setRecurrenceType("subscription");
    setDueDay(Number(today.slice(8, 10)));
    setSaved(true);
    setSaving(false);
    setLastTransaction({ id: inserted.id, description, amount });
    toast(recurring ? "Lançamento e recorrência salvos com sucesso!" : "Lançamento salvo com sucesso!", "success");
    setTimeout(() => setSaved(false), 2500);
  }
  return (
    <section className="flex flex-col gap-6">
      <header><h2 className="text-2xl font-semibold text-ink">Novo lançamento</h2><p className="mt-1 text-sm text-ink-muted">Cadastre gastos, receitas e benefícios de alimentação.</p></header>
      <BentoGrid>
        <GlassCard variant="hero" className="col-span-12 p-6 lg:p-7">
          <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[.16em] text-accent">Etapa 1</p><h3 className="mt-1 text-lg font-semibold text-ink">O que você deseja registrar?</h3></div>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Tipo do lançamento">
            {tipos.map(({ id, label, icon: Icon, tone }) => <button key={id} type="button" aria-pressed={tipo === id} onClick={() => chooseType(id)} className={`rounded-2xl border p-3 text-sm font-semibold transition ${tipo === id ? "border-accent bg-accent/10 text-ink" : "border-[var(--color-line)] text-ink-soft hover:bg-white/5"}`}><Icon className={`mx-auto mb-1 size-5 ${tone}`} />{label}</button>)}
          </div>
          <form className="mt-7 grid gap-x-5 gap-y-5 sm:grid-cols-2" onSubmit={submit}>
            <label className="field-label sm:col-span-2">Descrição<input className="field" name="description" placeholder={tipo === "benefit" ? "Ex.: Crédito mensal do vale-alimentação" : "Ex.: Compra no supermercado"} required /><span className="field-help">Use um nome que seja fácil de reconhecer no extrato.</span></label>
            <label className="field-label">Valor<MoneyInput name="amount" placeholder="0,00" required /></label>
            <label className="field-label">Data do lançamento<input className="field" name="date" type="date" defaultValue={today} required /></label>
            {tipo === "benefit" ? <label className="field-label">Categoria<input type="hidden" name="category" value="Alimentação" /><span className="field flex items-center bg-amber-400/10 text-warn">Alimentação · definida automaticamente</span></label> : <div className="sm:col-span-2"><div className="flex items-end gap-2"><label className="field-label min-w-0 flex-1">Categoria<SelectField name="category" value={selectedCategory} onChange={(event) => chooseCategory(event.target.value)}>{categoryOptions.map((name) => <option key={name} value={name}>{name}</option>)}</SelectField></label><button type="button" onClick={() => setShowCategoryForm((current) => !current)} className="mb-0.5 inline-flex min-h-12 items-center gap-2 rounded-2xl border border-[var(--color-line)] px-4 text-sm font-semibold text-accent transition hover:border-accent hover:bg-accent/10"><Plus className="size-4" /><span className="hidden sm:inline">Nova categoria</span></button></div>{showCategoryForm && <div className="surface-card mt-3 flex flex-wrap gap-2 rounded-2xl p-3"><input className="field min-w-48 flex-1" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void createCategory(); } }} placeholder="Nome da nova categoria" maxLength={80} autoFocus /><button type="button" className="btn-primary" onClick={() => void createCategory()} disabled={savingCategory}>{savingCategory ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}Adicionar</button>{categoryError && <p role="alert" className="w-full text-sm text-neg">{categoryError}</p>}</div>}</div>}
            {tipo === "benefit" && <label className="field-label">Tipo de benefício<SelectField name="benefit"><option value="vr">VR — Vale-refeição</option><option value="va">VA — Vale-alimentação</option><option value="flex">VR/VA flexível</option></SelectField></label>}
            {tipo === "benefit" && <label className="field-label">Operadora<SelectField name="benefit_operator" value={benefitOperator} onChange={(event) => setBenefitOperator(event.target.value)}>{Object.keys(BENEFIT_OPERATORS).map((key) => <option key={key} value={key}>{BENEFIT_OPERATORS[key].label}</option>)}</SelectField><span className="field-help">Identifica o cartão/app do benefício no extrato.</span></label>}
            {tipo === "benefit" && <div className="sm:col-span-2"><BrandBadge identity={getBrand(BENEFIT_OPERATORS, benefitOperator)} /></div>}
            {tipo === "expense" && <label className="field-label sm:col-span-2">Forma de pagamento<SelectField name="payment" value={payment} onChange={(event) => { setPayment(event.target.value); if (event.target.value !== "credit") setSelectedCardId(""); }}><option value="pix">Débito / Pix</option><option value="credit">Cartão de crédito — escolher cartão</option><option value="cash">Dinheiro</option><option value="benefit">VR / VA</option></SelectField></label>}
            {tipo === "expense" && payment === "credit" && <fieldset className="sm:col-span-2"><legend className="field-label">Qual cartão foi usado?</legend><p className="mt-1 text-xs text-ink-muted">Escolha um cartão cadastrado para vincular a compra à fatura.</p>{loadingCards ? <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted"><LoaderCircle className="size-4 animate-spin" />Carregando cartões...</p> : cards.length > 0 ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{cards.map((card) => <button key={card.id} type="button" aria-pressed={selectedCardId === card.id} onClick={() => setSelectedCardId(card.id)} className={`rounded-2xl border p-4 text-left transition ${selectedCardId === card.id ? "border-accent bg-accent/10 shadow-[0_0_0_2px_color-mix(in_oklab,var(--color-accent)_16%,transparent)]" : "border-[var(--color-line)] surface-card hover:border-[var(--color-line-strong)]"}`}><span className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: card.color ?? "var(--color-accent)" }} /><strong className="text-sm text-ink">{card.nickname}</strong><BrandBadge identity={getBrand(CARD_BRANDS, card.brand)} className="ml-auto" /></span><span className="mt-2 block text-xs text-ink-muted">Fecha dia {card.closing_day} · vence dia {card.due_day}</span></button>)}</div> : <Link href="/cartoes" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"><CreditCard className="size-4" />Cadastrar um cartão primeiro</Link>}{cardsError && <p className="mt-2 text-sm text-neg">{cardsError}</p>}{selectedCard && <div className="surface-card mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"><div><p className="text-sm font-semibold text-ink">{selectedCard.nickname} vinculado</p><p className="text-xs text-ink-muted">A compra entrará na fatura deste cartão.</p></div><div className="text-right"><p className="text-xs text-ink-muted">Fatura atual</p><p className="tnum text-sm font-semibold text-ink">{selectedCard.current_bill.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div></div>}</fieldset>}
            <div className="sm:col-span-2">
              <label className="ios-glass flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm text-ink-soft"><input type="checkbox" name="recurring" className="size-4" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} /><span><strong className="block font-semibold text-ink">Repetir mensalmente</strong><span className="text-xs text-ink-muted">Cria uma recorrência que pode ser pausada depois.</span></span></label>
              {recurring && (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label className="field-label">Tipo de recorrência<SelectField value={recurrenceType} onChange={(event) => setRecurrenceType(event.target.value as typeof recurrenceType)}><option value="subscription">Assinatura</option><option value="fixed_bill">Conta fixa</option><option value="installment">Parcelamento</option></SelectField></label>
                  <label className="field-label">Dia de vencimento<input className="field tnum" type="number" min={1} max={31} value={dueDay} onChange={(event) => setDueDay(Number(event.target.value))} required /><span className="field-help">Dia do mês em que a assinatura/conta vence.</span></label>
                </div>
              )}
            </div>
            {error && <p role="alert" className="rounded-2xl bg-rose-400/10 p-3 text-sm text-neg sm:col-span-2">{error}</p>}
            <button className="btn-primary sm:col-span-2" type="submit" disabled={saving}>{saving ? <><LoaderCircle className="size-4 animate-spin" />Salvando...</> : saved ? <><Check className="size-4" />Lançamento salvo</> : <><CreditCard className="size-4" />Salvar lançamento</>}</button>
          </form>
        </GlassCard>
      </BentoGrid>
      <AnimatePresence>
        {lastTransaction && (
          <motion.div
            className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="presentation"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="launch-success-title"
              className="liquid-glass-hero relative w-full max-w-md overflow-hidden rounded-[2rem] p-7 text-center sm:p-9"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.92 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 340, damping: 26 }}
            >
              <motion.div
                className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-400/15 text-pos"
                initial={reduceMotion ? undefined : { scale: 0, rotate: -25 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.08 }}
              >
                <CheckCircle2 className="size-10" strokeWidth={2.2} />
              </motion.div>
              <motion.div initial={reduceMotion ? undefined : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
                <p className="mt-5 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-[.18em] text-accent"><Sparkles className="size-3.5" />Tudo certo</p>
                <h2 id="launch-success-title" className="mt-2 text-2xl font-semibold text-ink">Lançamento salvo!</h2>
                <p className="mt-2 text-sm text-ink-soft"><strong className="font-semibold text-ink">{lastTransaction.description}</strong> entrou no seu histórico com o valor de <span className="tnum font-semibold text-ink">{lastTransaction.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>.</p>
              </motion.div>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <button type="button" className="btn-primary" onClick={() => router.push(`/transacoes?created=${lastTransaction.id}`)}>Ver no histórico<ArrowRight className="size-4" /></button>
                <button type="button" className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-ink-soft transition hover:border-accent hover:text-ink" onClick={() => setLastTransaction(null)}><Plus className="mr-1.5 inline size-4" />Novo lançamento</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
