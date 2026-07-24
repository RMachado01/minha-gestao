"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, Database, LoaderCircle, RefreshCw, Send, X } from "lucide-react";
import { BunnyPaw } from "@/components/ui/BunnyPaw";
import { answerFinancialQuestion, computeInsights, type FinancialGoal, type Insight, type TransactionSummary } from "@/lib/goals";
import { askAdvisorAI, buildAdvisorContext } from "@/lib/advisor/askAI";
import { createClient } from "@/lib/supabase/client";
import { SelectField } from "@/components/forms/SelectField";

const QUICK_QUESTIONS = [
  "Onde mais gastei este mês?",
  "Qual minha taxa de economia?",
  "Como está minha reserva?",
  "Quanto tenho em cartões?",
];

const INSIGHT_TONE: Record<Insight["tone"], string> = {
  pos: "border-[color-mix(in_oklab,var(--color-pos)_25%,var(--color-line))] bg-[color-mix(in_oklab,var(--color-pos)_7%,transparent)]",
  neg: "border-[color-mix(in_oklab,var(--color-neg)_25%,var(--color-line))] bg-[color-mix(in_oklab,var(--color-neg)_7%,transparent)]",
  warn: "border-[color-mix(in_oklab,var(--color-warn)_25%,var(--color-line))] bg-[color-mix(in_oklab,var(--color-warn)_7%,transparent)]",
  neutral: "border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-ink)_3%,transparent)]",
};

interface AccountData {
  transactions: TransactionSummary[];
  goals: FinancialGoal[];
  investmentTotal: number;
  creditCardBills: number;
  benefitBalance: number;
}

interface AdvisorMessage { role: "user" | "assistant"; text: string }

const EMPTY: AccountData = { transactions: [], goals: [], investmentTotal: 0, creditCardBills: 0, benefitBalance: 0 };

export function FinancialAdvisorWidget() {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<AccountData>(EMPTY);
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [question, setQuestion] = useState("");
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<AdvisorMessage[]>([
    { role: "assistant", text: "Posso explicar seus gastos, saldo, cartões, reserva e metas usando somente os dados cadastrados nesta conta." },
  ]);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const focusDialog = window.requestAnimationFrame(() => dialogRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(focusDialog);
      document.removeEventListener("keydown", closeOnEscape);
      trigger?.focus();
    };
  }, [open]);

  const load = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) { setError("Supabase não configurado."); return; }
    setLoading(true);
    setError("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setError("Sua sessão expirou."); setLoading(false); return; }

    const userId = auth.user.id;
    const referenceMonth = new Date().toISOString().slice(0, 7);
    const historyStart = new Date();
    historyStart.setMonth(historyStart.getMonth() - 23, 1);
    const historyStartIso = historyStart.toISOString().slice(0, 10);

    const [transactions, goals, investments, cards, bills] = await Promise.all([
      supabase.from("transactions").select("type,amount,occurred_on,category").eq("user_id", userId).gte("occurred_on", historyStartIso).order("occurred_on", { ascending: false }).limit(2000),
      supabase.from("financial_goals").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("investments").select("invested_amount").eq("user_id", userId),
      supabase.from("credit_cards").select("card_type,vr_balance,va_balance,flex_balance").eq("user_id", userId).eq("active", true),
      supabase.from("vw_fatura_cartao_mensal").select("total").eq("user_id", userId).eq("reference_month", referenceMonth),
    ]);

    if (transactions.error) setError("Não consegui carregar seus lançamentos agora.");
    const normalizedTransactions = ((transactions.data ?? []) as { type: TransactionSummary["type"]; amount: number | string; occurred_on: string; category: string }[])
      .map((item) => ({ ...item, amount: Number(item.amount) }));
    const normalizedGoals = goals.error ? [] : ((goals.data ?? []) as FinancialGoal[]).map((goal) => ({
      ...goal,
      target_amount: Number(goal.target_amount),
      current_amount: Number(goal.current_amount),
      contribution_value: Number(goal.contribution_value),
      custom_annual_rate: goal.custom_annual_rate === null ? null : Number(goal.custom_annual_rate),
    }));
    const benefitBalance = cards.error ? 0 : (cards.data ?? [])
      .filter((card) => card.card_type === "benefit")
      .reduce((sum, card) => sum + Number(card.vr_balance) + Number(card.va_balance) + Number(card.flex_balance), 0);

    setData({
      transactions: normalizedTransactions,
      goals: normalizedGoals,
      investmentTotal: (investments.data ?? []).reduce((sum, item) => sum + Number(item.invested_amount), 0),
      creditCardBills: (bills.data ?? []).reduce((sum, item) => sum + Number(item.total), 0),
      benefitBalance,
    });
    setSelectedGoalId((current) => current || normalizedGoals.find((goal) => goal.status === "active")?.id || "");
    setLoaded(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    const show = () => {
      setOpen(true);
      if (!loaded) void load();
    };
    window.addEventListener("mg-open-advisor", show);
    return () => window.removeEventListener("mg-open-advisor", show);
  }, [load, loaded]);

  const selectedGoal = useMemo(
    () => data.goals.find((goal) => goal.id === selectedGoalId) ?? null,
    [data.goals, selectedGoalId],
  );
  const insights = useMemo(
    () => loaded ? computeInsights(data.transactions, data.goals, { creditCardBills: data.creditCardBills, benefitBalance: data.benefitBalance }) : [],
    [loaded, data],
  );

  function ruleBasedAnswer(text: string): string {
    return answerFinancialQuestion(text, data.transactions, data.goals, selectedGoal, data.investmentTotal, {
      creditCardBills: data.creditCardBills,
      benefitBalance: data.benefitBalance,
    });
  }

  async function ask(value = question) {
    const text = value.trim();
    if (!text || loading || thinking) return;
    // Mostra a pergunta na hora e um estado "pensando".
    setMessages((current) => [...current, { role: "user" as const, text }].slice(-8));
    setQuestion("");
    setThinking(true);

    // Tenta a IA (Groq, via rota server-side); se indisponível, usa as regras.
    const context = buildAdvisorContext(data);
    const aiAnswer = await askAdvisorAI(text, context);
    const answer = aiAnswer ?? ruleBasedAnswer(text);

    setMessages((current) => [...current, { role: "assistant" as const, text: answer }].slice(-8));
    setThinking(false);
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) void load();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-3 z-[var(--z-advisor)] flex min-h-12 max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--ai-accent)_28%,var(--color-line))] bg-[var(--color-surface-2)] px-4 text-sm font-semibold text-ink shadow-[var(--shadow-elevated)] transition-colors hover:bg-[color-mix(in_oklab,var(--color-surface-2)_88%,var(--ai-accent))] lg:bottom-6 lg:right-6"
        aria-label={open ? "Fechar inteligência da conta" : "Abrir inteligência da conta"}
        aria-expanded={open}
        aria-controls="financial-advisor-dialog"
      >
        {open ? <ChevronDown className="size-4 ai-accent" /> : <BunnyPaw className="size-4 ai-accent" />}
        <span>{open ? "Minimizar" : "Inteligência"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.section
            ref={dialogRef}
            tabIndex={-1}
            id="financial-advisor-dialog"
            role="dialog"
            aria-label="Inteligência da conta"
            data-lenis-prevent
            className="ai-surface fixed inset-x-3 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] z-[var(--z-advisor)] flex max-h-[calc(100dvh-12rem-env(safe-area-inset-bottom))] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[var(--radius-card-lg)] shadow-[var(--shadow-elevated)] outline-none sm:left-auto sm:w-[440px] lg:bottom-20 lg:right-6"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: .985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: .99 }}
            transition={{ duration: reduceMotion ? .01 : .24, ease: [.2, .8, .2, 1] }}
          >
            <header className="flex items-center gap-3 border-b border-[var(--color-line)] p-4">
              <span className="grid size-9 place-items-center ai-accent"><BunnyPaw className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold tracking-[-.02em] text-ink">Inteligência da conta</h2>
                <p className="mt-0.5 text-xs text-ink-muted">Leitura contextual, sem dados inventados</p>
              </div>
              <button type="button" onClick={() => void load()} className="grid size-10 place-items-center rounded-xl text-ink-muted transition-colors hover:bg-[var(--ai-surface)]" aria-label="Atualizar dados"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></button>
              <button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-xl text-ink-muted transition-colors hover:bg-[var(--ai-surface)]" aria-label="Fechar"><X className="size-4" /></button>
            </header>

            <div className="flex items-center justify-between gap-2 border-b border-[var(--color-line)] px-4 py-2.5">
              <span className="ai-proof"><Database className="size-3" />{loaded ? `${data.transactions.length} lançamentos analisados` : "Carregando origem dos dados"}</span>
              <span className="text-[10px] text-ink-muted">Até 24 meses</span>
            </div>

            {data.goals.length > 0 && (
              <div className="border-b border-[var(--color-line)] px-4 py-3">
                <label className="text-xs font-medium text-ink-muted">Meta usada nas projeções
                  <SelectField className="mt-1 min-h-10 py-2 text-sm" value={selectedGoalId} onChange={(event) => setSelectedGoalId(event.target.value)}>
                    <option value="">Visão geral</option>
                    {data.goals.filter((goal) => goal.status === "active").map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
                  </SelectField>
                </label>
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {insights.length > 0 && (
                <div className="space-y-2">
                  <p className="eyebrow ai-accent flex items-center gap-1.5"><BunnyPaw className="size-3" />Leitura da conta</p>
                  {insights.slice(0, 3).map((insight) => (
                    <div key={insight.id} className={`rounded-xl border px-3.5 py-3 text-sm leading-5 text-ink-soft ${INSIGHT_TONE[insight.tone]}`}>{insight.text}</div>
                  ))}
                </div>
              )}
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`max-w-[92%] rounded-2xl px-3.5 py-3 text-sm leading-5 ${message.role === "assistant" ? "border border-[var(--color-line)] bg-[var(--color-surface)] text-ink-soft" : "ml-auto bg-[var(--ai-accent)] text-white"}`}>{message.text}</div>
              ))}
              {loading && <p className="flex items-center gap-2 text-xs text-ink-muted"><LoaderCircle className="size-4 animate-spin" />Atualizando sua conta...</p>}
              {error && <p role="alert" className="rounded-xl bg-[color-mix(in_oklab,var(--color-neg)_10%,transparent)] p-3 text-xs text-neg">{error}</p>}
            </div>

            <div className="border-t border-[var(--color-line)] p-4">
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {QUICK_QUESTIONS.map((item) => <button key={item} type="button" disabled={thinking} onClick={() => void ask(item)} className="shrink-0 rounded-full border border-[var(--color-line)] px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-[var(--ai-accent)] disabled:opacity-50">{item}</button>)}
              </div>
              {thinking && <p className="mb-2 flex items-center gap-2 text-xs text-ink-muted"><LoaderCircle className="size-3.5 animate-spin" />Analisando seus dados...</p>}
              <div className="relative">
                <input className="field pr-12" value={question} disabled={thinking} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void ask(); } }} placeholder="Pergunte sobre sua conta..." aria-label="Pergunta à inteligência da conta" />
                <button type="button" disabled={thinking} onClick={() => void ask()} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl bg-[var(--ai-accent)] text-white disabled:opacity-50" aria-label="Enviar">{thinking ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}</button>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-ink-muted">Simulações não garantem retorno nem substituem orientação profissional. <Link href="/metas" className="font-semibold ai-accent">Abrir metas</Link></p>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
