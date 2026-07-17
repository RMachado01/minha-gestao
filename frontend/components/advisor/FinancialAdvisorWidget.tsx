"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bot, ChevronDown, LoaderCircle, RefreshCw, Send, Sparkles, X } from "lucide-react";
import { answerFinancialQuestion, computeInsights, type FinancialGoal, type Insight, type TransactionSummary } from "@/lib/goals";
import { createClient } from "@/lib/supabase/client";
import { SelectField } from "@/components/forms/SelectField";

const QUICK_QUESTIONS = ["Como estão meus gastos este mês?", "Qual minha taxa de economia?", "Como está minha reserva?", "Quanto tenho em cartões?"];

const INSIGHT_TONE: Record<Insight["tone"], string> = {
  pos: "border-emerald-400/25 bg-emerald-400/10 text-pos",
  neg: "border-rose-400/25 bg-rose-400/10 text-neg",
  warn: "border-amber-400/25 bg-amber-400/10 text-warn",
  neutral: "border-[var(--color-line)] bg-white/[.04] text-ink-soft",
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
  const [messages, setMessages] = useState<AdvisorMessage[]>([{ role: "assistant", text: "Olá! Analiso somente os dados cadastrados na sua conta. Pergunte sobre gastos, saldo, cartões, reserva ou metas." }]);
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
    const normalizedTransactions = ((transactions.data ?? []) as { type: TransactionSummary["type"]; amount: number | string; occurred_on: string; category: string }[]).map((item) => ({ ...item, amount: Number(item.amount) }));
    const normalizedGoals = goals.error ? [] : ((goals.data ?? []) as FinancialGoal[]).map((goal) => ({ ...goal, target_amount: Number(goal.target_amount), current_amount: Number(goal.current_amount), contribution_value: Number(goal.contribution_value), custom_annual_rate: goal.custom_annual_rate === null ? null : Number(goal.custom_annual_rate) }));
    const benefitBalance = cards.error ? 0 : (cards.data ?? []).filter((card) => card.card_type === "benefit").reduce((sum, card) => sum + Number(card.vr_balance) + Number(card.va_balance) + Number(card.flex_balance), 0);
    setData({ transactions: normalizedTransactions, goals: normalizedGoals, investmentTotal: (investments.data ?? []).reduce((sum, item) => sum + Number(item.invested_amount), 0), creditCardBills: (bills.data ?? []).reduce((sum, item) => sum + Number(item.total), 0), benefitBalance });
    setSelectedGoalId((current) => current || normalizedGoals.find((goal) => goal.status === "active")?.id || "");
    setLoaded(true);
    setLoading(false);
  }, []);

  const selectedGoal = useMemo(() => data.goals.find((goal) => goal.id === selectedGoalId) ?? null, [data.goals, selectedGoalId]);
  const insights = useMemo(
    () => (loaded ? computeInsights(data.transactions, data.goals, { creditCardBills: data.creditCardBills, benefitBalance: data.benefitBalance }) : []),
    [loaded, data],
  );

  function ask(value = question) {
    const text = value.trim();
    if (!text || loading) return;
    const answer = answerFinancialQuestion(text, data.transactions, data.goals, selectedGoal, data.investmentTotal, { creditCardBills: data.creditCardBills, benefitBalance: data.benefitBalance });
    const next: AdvisorMessage[] = [{ role: "user", text }, { role: "assistant", text: answer }];
    setMessages((current) => [...current, ...next].slice(-8));
    setQuestion("");
  }

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => { const next = !open; setOpen(next); if (next && !loaded) void load(); }} className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-3 z-[60] flex min-h-12 max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-3)] px-4 text-sm font-semibold text-white shadow-2xl shadow-[var(--color-accent)]/25 lg:bottom-6 lg:right-6" aria-label={open ? "Fechar assessor financeiro" : "Abrir assessor financeiro"} aria-expanded={open} aria-controls="financial-advisor-dialog">
        {open ? <ChevronDown className="size-5" /> : <Sparkles className="size-5" />}<span>{open ? "Minimizar" : "Meu assessor"}</span>
      </button>
      <AnimatePresence>
        {open && <motion.section ref={dialogRef} tabIndex={-1} id="financial-advisor-dialog" role="dialog" aria-label="Assessor financeiro" data-lenis-prevent className="liquid-glass-hero fixed inset-x-3 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] z-[59] flex max-h-[calc(100dvh-12rem-env(safe-area-inset-bottom))] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[1.75rem] shadow-2xl outline-none sm:left-auto sm:w-[430px] lg:bottom-20 lg:right-6" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: .97 }}>
          <header className="flex items-center gap-3 border-b border-[var(--color-line)] p-4"><span className="grid size-10 place-items-center rounded-2xl bg-accent/10 text-accent"><Bot className="size-5" /></span><div className="min-w-0 flex-1"><h2 className="font-semibold text-ink">Assessor da sua conta</h2><p className="text-xs text-ink-muted">Análises com seus dados cadastrados</p></div><button type="button" onClick={() => void load()} className="grid size-9 place-items-center rounded-xl text-ink-muted hover:bg-white/5" aria-label="Atualizar dados"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></button><button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-xl text-ink-muted hover:bg-white/5" aria-label="Fechar"><X className="size-4" /></button></header>
          {data.goals.length > 0 && <div className="border-b border-[var(--color-line)] px-4 py-3"><label className="text-xs font-medium text-ink-muted">Meta usada nas projeções<SelectField className="mt-1 min-h-10 py-2 text-sm" value={selectedGoalId} onChange={(event) => setSelectedGoalId(event.target.value)}><option value="">Visão geral</option>{data.goals.filter((goal) => goal.status === "active").map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</SelectField></label></div>}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {insights.length > 0 && (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted"><Sparkles className="size-3" />Destaques da sua conta</p>
                {insights.map((insight) => (
                  <div key={insight.id} className={`rounded-2xl border px-3.5 py-3 text-sm leading-5 ${INSIGHT_TONE[insight.tone]}`}>{insight.text}</div>
                ))}
              </div>
            )}
            {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`max-w-[92%] rounded-2xl px-3.5 py-3 text-sm leading-5 ${message.role === "assistant" ? "bg-white/[.055] text-ink-soft" : "ml-auto bg-accent text-white"}`}>{message.text}</div>)}
            {loading && <p className="flex items-center gap-2 text-xs text-ink-muted"><LoaderCircle className="size-4 animate-spin" />Atualizando sua conta...</p>}
            {error && <p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-xs text-neg">{error}</p>}
          </div>
          <div className="border-t border-[var(--color-line)] p-4"><div className="mb-3 flex gap-2 overflow-x-auto pb-1">{QUICK_QUESTIONS.map((item) => <button key={item} type="button" onClick={() => ask(item)} className="shrink-0 rounded-full border border-[var(--color-line)] px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-accent">{item}</button>)}</div><div className="relative"><input className="field pr-12" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); ask(); } }} placeholder="Pergunte sobre sua conta..." aria-label="Pergunta ao assessor" /><button type="button" onClick={() => ask()} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl bg-accent text-white" aria-label="Enviar"><Send className="size-4" /></button></div><p className="mt-2 text-[10px] leading-4 text-ink-muted">Simulações não são garantia de retorno nem substituem orientação profissional. <Link href="/metas" className="font-semibold text-accent">Abrir metas</Link></p></div>
        </motion.section>}
      </AnimatePresence>
    </>
  );
}
