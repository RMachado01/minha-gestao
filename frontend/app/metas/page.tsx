"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bot,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock3,
  Goal,
  LoaderCircle,
  MessageCircleQuestion,
  Plus,
  Send,
  Settings2,
  Sparkles,
  Target,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { useToast } from "@/components/ui/Toast";
import { formatBRL } from "@/lib/format";
import { GoalManageDialog } from "@/components/goals/GoalManageDialog";
import {
  answerFinancialQuestion,
  averageIncome,
  formatDuration,
  futureValue,
  GOAL_TYPES,
  INVESTMENT_SCENARIOS,
  monthlyContribution,
  monthsToTarget,
  type ContributionMode,
  type FinancialGoal,
  type GoalEvent,
  type ScenarioId,
  type TransactionSummary,
} from "@/lib/goals";

interface RawGoal extends Omit<FinancialGoal, "target_amount" | "current_amount" | "contribution_value" | "custom_annual_rate"> {
  target_amount: number | string;
  current_amount: number | string;
  contribution_value: number | string;
  custom_annual_rate: number | string | null;
}

interface RawEvent extends Omit<GoalEvent, "amount"> { amount: number | string | null }
interface RawTransaction extends Omit<TransactionSummary, "amount"> { amount: number | string }

const quickQuestions = [
  "Qual é o meu saldo?",
  "Onde estou gastando mais?",
  "Quanto vou guardar por mês?",
  "Quando alcanço esta meta?",
];

function normalizeGoal(goal: RawGoal): FinancialGoal {
  return {
    ...goal,
    target_amount: Number(goal.target_amount),
    current_amount: Number(goal.current_amount),
    contribution_value: Number(goal.contribution_value),
    custom_annual_rate: goal.custom_annual_rate === null ? null : Number(goal.custom_annual_rate),
  };
}

function parseMoney(value: FormDataEntryValue | null): number {
  const raw = String(value ?? "").trim();
  return Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
}

function scenarioRate(goal: FinancialGoal, scenarioId: ScenarioId, customRate: number): number {
  if (scenarioId === "custom") return customRate;
  return INVESTMENT_SCENARIOS.find((item) => item.id === scenarioId)?.annualRate ?? 0;
}

export default function GoalsPage() {
  const { toast } = useToast();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [events, setEvents] = useState<GoalEvent[]>([]);
  const [transactions, setTransactions] = useState<TransactionSummary[]>([]);
  const [investmentTotal, setInvestmentTotal] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [contributionMode, setContributionMode] = useState<ContributionMode>("fixed");
  const [preferredScenario, setPreferredScenario] = useState<ScenarioId>("cdb");
  const [eventType, setEventType] = useState<"contribution" | "withdrawal" | "note">("contribution");
  const [customRate, setCustomRate] = useState(7);
  const [horizonYears, setHorizonYears] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventSaving, setEventSaving] = useState(false);
  const [error, setError] = useState("");
  const [managedGoal, setManagedGoal] = useState<FinancialGoal | null>(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<string[]>([
    "Olá! Eu uso somente os dados da sua conta para ajudar com saldo, gastos, aportes e prazos das metas. O que você quer analisar?",
  ]);

  const selectedGoal = goals.find((goal) => goal.id === selectedId) ?? goals[0] ?? null;
  const incomeAverage = useMemo(() => averageIncome(transactions), [transactions]);
  const selectedMonthly = selectedGoal ? monthlyContribution(selectedGoal, incomeAverage) : 0;
  const selectedEvents = events.filter((event) => event.goal_id === selectedGoal?.id);

  async function loadData() {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setLoading(false);
      return;
    }

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setError("Sua sessão expirou. Entre novamente.");
        return;
      }

      const [goalsResult, eventsResult, transactionsResult, investmentsResult] = await Promise.all([
        supabase.from("financial_goals").select("*").neq("status", "cancelled").order("created_at", { ascending: false }),
        supabase.from("goal_events").select("*").order("occurred_on", { ascending: false }).limit(150),
        supabase.from("transactions").select("type,amount,occurred_on,category").order("occurred_on", { ascending: false }).limit(1000),
        supabase.from("investments").select("invested_amount"),
      ]);

      if (goalsResult.error) {
        setError(goalsResult.error.code === "42P01"
          ? "O módulo de metas ainda precisa da migration 202607160001 no Supabase."
          : "Não foi possível carregar suas metas.");
      } else {
        const loadedGoals = ((goalsResult.data ?? []) as RawGoal[]).map(normalizeGoal);
        setGoals(loadedGoals);
        setSelectedId((current) => current || loadedGoals[0]?.id || "");
        if (loadedGoals[0] && loadedGoals[0].custom_annual_rate !== null) setCustomRate(loadedGoals[0].custom_annual_rate);
      }

      if (!eventsResult.error) {
        setEvents(((eventsResult.data ?? []) as RawEvent[]).map((event) => ({ ...event, amount: event.amount === null ? null : Number(event.amount) })));
      }
      if (!transactionsResult.error) {
        setTransactions(((transactionsResult.data ?? []) as RawTransaction[]).map((item) => ({ ...item, amount: Number(item.amount) })));
      }
      if (!investmentsResult.error) {
        setInvestmentTotal((investmentsResult.data ?? []).reduce((sum, item) => sum + Number(item.invested_amount), 0));
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setError(`Não foi possível carregar os dados. Detalhe: ${detail}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadData(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function createGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const targetAmount = parseMoney(data.get("target_amount"));
    const currentAmount = parseMoney(data.get("current_amount")) || 0;
    const contributionValue = parseMoney(data.get("contribution_value"));
    if (![targetAmount, currentAmount, contributionValue].every(Number.isFinite) || targetAmount <= 0 || currentAmount < 0 || contributionValue <= 0) {
      setError("Revise os valores da meta e do aporte.");
      return;
    }
    if (contributionMode === "percentage" && contributionValue > 100) {
      setError("O percentual mensal deve estar entre 0 e 100%.");
      return;
    }

    const supabase = createClient();
    if (!supabase) return;
    setSaving(true);
    setError("");
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) {
      setError("Sua sessão expirou. Entre novamente.");
      setSaving(false);
      return;
    }

    const { data: inserted, error: insertError } = await supabase.from("financial_goals").insert({
      user_id: user.id,
      name: String(data.get("name")).trim(),
      goal_type: String(data.get("goal_type")),
      description: String(data.get("description") ?? "").trim() || null,
      target_amount: targetAmount,
      current_amount: currentAmount,
      contribution_mode: contributionMode,
      contribution_value: contributionValue,
      target_date: String(data.get("target_date") ?? "") || null,
      preferred_scenario: preferredScenario,
      custom_annual_rate: preferredScenario === "custom" ? customRate : null,
    }).select("*").single();

    if (insertError || !inserted) {
      setError("Não foi possível criar a meta. Confirme se a migration foi aplicada.");
    } else {
      const goal = normalizeGoal(inserted as RawGoal);
      setGoals((current) => [goal, ...current]);
      setSelectedId(goal.id);
      form.reset();
      setContributionMode("fixed");
      setPreferredScenario("cdb");
      toast("Meta criada. Agora registre os aportes na linha do tempo.", "success");
    }
    setSaving(false);
  }

  async function addEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGoal) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const eventType = String(data.get("event_type"));
    const amount = eventType === "note" ? null : parseMoney(data.get("amount"));
    if (eventType !== "note" && (!amount || amount <= 0)) {
      setError("Informe um valor maior que zero para o evento.");
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    setEventSaving(true);
    setError("");
    const { error: rpcError } = await supabase.rpc("record_goal_event", {
      p_goal_id: selectedGoal.id,
      p_event_type: eventType,
      p_amount: amount,
      p_description: String(data.get("description") ?? ""),
      p_occurred_on: String(data.get("occurred_on")),
    });
    if (rpcError) {
      setError("Não foi possível registrar o evento.");
    } else {
      form.reset();
      setEventType("contribution");
      toast(eventType === "note" ? "Nota adicionada." : "Progresso atualizado.", "success");
      await loadData();
    }
    setEventSaving(false);
  }

  function ask(rawQuestion?: string) {
    const text = (rawQuestion ?? question).trim();
    if (!text) return;
    const response = answerFinancialQuestion(text, transactions, goals, selectedGoal, investmentTotal);
    setMessages((current) => [...current, `Você: ${text}`, response]);
    setQuestion("");
  }

  const projections = selectedGoal ? INVESTMENT_SCENARIOS.map((scenario) => {
    const rate = scenarioRate(selectedGoal, scenario.id, customRate);
    const months = monthsToTarget(selectedGoal.current_amount, selectedGoal.target_amount, selectedMonthly, rate);
    return { ...scenario, rate, months, inHorizon: futureValue(selectedGoal.current_amount, selectedMonthly, rate, horizonYears * 12) };
  }) : [];

  return (
    <section className="flex flex-col gap-6 py-2">
      <PageHeader
        eyebrow="Planejamento pessoal"
        title="Sonhos e Metas"
        description="Transforme um objetivo em um plano mensal, acompanhe eventos e compare cenários de crescimento."
      />

      {error && <div role="alert" className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-neg">{error}</div>}

      <BentoGrid>
        <GlassCard variant="hero" className="col-span-12 lg:col-span-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-accent/10 text-accent"><Sparkles className="size-5" /></span>
            <div><h2 className="font-semibold text-ink">Criar um novo sonho</h2><p className="text-sm text-ink-muted">Dê um valor e uma regra de aporte ao seu objetivo.</p></div>
          </div>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={createGoal}>
            <label className="field-label sm:col-span-2">Nome da meta<input className="field" name="name" placeholder="Ex.: Meu primeiro apartamento" minLength={2} maxLength={80} required /></label>
            <label className="field-label">Tipo<select className="field" name="goal_type">{GOAL_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
            <label className="field-label">Valor desejado<MoneyInput name="target_amount" placeholder="0,00" required /></label>
            <label className="field-label">Quanto já possui<MoneyInput name="current_amount" placeholder="0,00" /></label>
            <label className="field-label">Data desejada<input className="field" type="date" name="target_date" min={new Date().toISOString().slice(0, 10)} /></label>
            <fieldset className="sm:col-span-2">
              <legend className="field-label mb-2">Como deseja separar dinheiro?</legend>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" aria-pressed={contributionMode === "fixed"} onClick={() => setContributionMode("fixed")} className={`rounded-2xl border p-3 text-sm font-semibold ${contributionMode === "fixed" ? "border-accent bg-accent/10 text-ink" : "border-[var(--color-line)] text-ink-soft"}`}>Valor fixo mensal</button>
                <button type="button" aria-pressed={contributionMode === "percentage"} onClick={() => setContributionMode("percentage")} className={`rounded-2xl border p-3 text-sm font-semibold ${contributionMode === "percentage" ? "border-accent bg-accent/10 text-ink" : "border-[var(--color-line)] text-ink-soft"}`}>% da renda mensal</button>
              </div>
            </fieldset>
            <label className="field-label">
              {contributionMode === "fixed" ? "Aporte mensal" : "Percentual da renda"}
              {contributionMode === "fixed" ? <MoneyInput name="contribution_value" placeholder="0,00" required /> : <span className="relative"><input className="field field-with-suffix tnum" name="contribution_value" type="number" min="0.01" max="100" step="0.01" placeholder="10" required /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-ink-muted">%</span></span>}
              {contributionMode === "percentage" && <span className="field-help">Calculado sobre a média das receitas registradas.</span>}
            </label>
            <label className="field-label">Cenário preferido<select className="field" name="preferred_scenario" value={preferredScenario} onChange={(event) => setPreferredScenario(event.target.value as ScenarioId)}>{INVESTMENT_SCENARIOS.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}</select></label>
            {preferredScenario === "custom" && <label className="field-label">Hipótese anual personalizada<span className="relative"><input className="field field-with-suffix tnum" type="number" min="0" max="100" step="0.1" value={customRate} onChange={(event) => setCustomRate(Number(event.target.value))} required /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-ink-muted">%</span></span></label>}
            <label className="field-label sm:col-span-2">Descrição opcional<textarea className="field min-h-24 resize-y" name="description" maxLength={600} placeholder="Por que esse sonho é importante? Há alguma condição ou etapa?" /></label>
            <button className="btn-primary sm:col-span-2" type="submit" disabled={saving || loading}>{saving ? <><LoaderCircle className="size-4 animate-spin" />Criando...</> : <><Plus className="size-4" />Criar meta</>}</button>
          </form>
        </GlassCard>

        <GlassCard variant="liquid" className="col-span-12 lg:col-span-5">
          <div className="flex items-center gap-3"><Bot className="size-5 text-accent" /><div><h2 className="font-semibold text-ink">Consultor da sua conta</h2><p className="text-xs text-ink-muted">Respostas calculadas com seus dados registrados</p></div></div>
          <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1" aria-live="polite">
            {messages.map((message, index) => <div key={`${index}-${message.slice(0, 12)}`} className={`rounded-2xl p-3 text-sm leading-relaxed ${message.startsWith("Você:") ? "ml-8 bg-accent/10 text-ink" : "mr-3 surface-card text-ink-soft"}`}>{message}</div>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{quickQuestions.map((item) => <button key={item} type="button" onClick={() => ask(item)} className="rounded-full border border-[var(--color-line)] px-3 py-1.5 text-xs text-ink-soft hover:border-accent hover:text-ink">{item}</button>)}</div>
          <div className="relative mt-4"><input className="field pr-12" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); ask(); } }} placeholder="Pergunte sobre sua conta..." aria-label="Pergunta para o consultor" /><button type="button" onClick={() => ask()} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl bg-accent text-white" aria-label="Enviar pergunta"><Send className="size-4" /></button></div>
          <p className="mt-3 flex gap-2 text-[11px] leading-relaxed text-ink-muted"><MessageCircleQuestion className="mt-0.5 size-3.5 shrink-0" />O consultor não movimenta dinheiro e não substitui orientação financeira profissional.</p>
        </GlassCard>
      </BentoGrid>

      <section>
        <div className="mb-4 flex items-end justify-between"><div><h2 className="text-lg font-semibold text-ink">Seus objetivos</h2><p className="text-sm text-ink-muted">Selecione uma meta para abrir sua projeção e linha do tempo.</p></div>{loading && <LoaderCircle className="size-5 animate-spin text-accent" />}</div>
        {!loading && goals.length === 0 ? (
          <GlassCard className="grid min-h-48 place-items-center text-center"><div><Goal className="mx-auto size-8 text-accent" /><h3 className="mt-3 font-semibold text-ink">Seu primeiro sonho começa acima</h3><p className="mt-1 text-sm text-ink-muted">Cadastre uma meta para visualizar prazo, evolução e próximos passos.</p></div></GlassCard>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{goals.map((goal) => {
            const progress = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
            return (
              <div
                key={goal.id}
                role="button"
                tabIndex={0}
                onClick={() => { setSelectedId(goal.id); if (goal.custom_annual_rate !== null) setCustomRate(goal.custom_annual_rate); }}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(goal.id); if (goal.custom_annual_rate !== null) setCustomRate(goal.custom_annual_rate); } }}
                className={`surface-card rounded-[var(--radius-card)] p-5 text-left transition ${selectedGoal?.id === goal.id ? "border-accent shadow-[0_0_0_2px_color-mix(in_oklab,var(--color-accent)_24%,transparent)]" : "hover:-translate-y-0.5"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-2xl bg-accent/10 text-accent"><Target className="size-5" /></span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-ink-muted">{GOAL_TYPES.find((item) => item.value === goal.goal_type)?.label}</span>
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); setManagedGoal(goal); }}
                      className="grid size-8 shrink-0 place-items-center rounded-xl border border-[var(--color-line)] text-ink-soft hover:text-ink"
                      aria-label={`Gerenciar meta ${goal.name}`}
                    >
                      <Settings2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="mt-4 font-semibold text-ink">{goal.name}</h3><p className="mt-1 line-clamp-2 min-h-10 text-sm text-ink-muted">{goal.description || "Sem descrição"}</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-accent to-pos" style={{ width: `${progress}%` }} /></div>
                <div className="mt-2 flex justify-between text-xs"><span className="tnum font-semibold text-ink">{formatBRL(goal.current_amount)}</span><span className="tnum text-ink-muted">{progress.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% de {formatBRL(goal.target_amount)}</span></div>
              </div>
            );
          })}</div>
        )}
      </section>

      {selectedGoal && <BentoGrid>
        <GlassCard variant="hero" className="col-span-12 xl:col-span-8">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-accent">Projeção de {selectedGoal.name}</p><h2 className="mt-1 text-xl font-semibold text-ink">Compare caminhos para chegar lá</h2></div><div className="rounded-2xl bg-accent/10 px-4 py-2 text-right"><p className="text-xs text-ink-muted">Aporte mensal estimado</p><p className="tnum font-semibold text-ink">{formatBRL(selectedMonthly)}</p></div></div>
          {selectedGoal.contribution_mode === "percentage" && incomeAverage === 0 && <p className="mt-4 rounded-2xl bg-amber-400/10 p-3 text-sm text-warn">Cadastre receitas para calcular o aporte percentual e liberar uma projeção útil.</p>}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label htmlFor="horizon-years" className="text-sm font-medium text-ink-soft">Simular saldo em</label>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Horizonte de simulação">
              {[1, 3, 5, 10, 15, 20, 30].map((years) => (
                <button key={years} type="button" aria-pressed={horizonYears === years} onClick={() => setHorizonYears(years)} className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${horizonYears === years ? "border-accent bg-accent/10 text-ink" : "border-[var(--color-line)] text-ink-soft hover:text-ink"}`}>{years} {years === 1 ? "ano" : "anos"}</button>
              ))}
            </div>
          </div>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b border-[var(--color-line)] text-xs uppercase tracking-wide text-ink-muted"><th className="pb-3">Cenário</th><th className="pb-3">Hipótese anual</th><th className="pb-3">Risco</th><th className="pb-3">Prazo p/ meta</th><th className="pb-3 text-right">Saldo em {horizonYears} {horizonYears === 1 ? "ano" : "anos"}</th></tr></thead><tbody>{projections.map((item) => <tr key={item.id} className="border-b border-[var(--color-line)] last:border-0"><td className="py-4 font-medium text-ink">{item.name}</td><td className="py-4">{item.id === "custom" ? <span className="relative inline-block w-24"><input className="field field-with-suffix min-h-9 py-1.5 tnum" type="number" min="0" max="100" step="0.1" value={customRate} onChange={(event) => setCustomRate(Number(event.target.value))} aria-label="Taxa anual personalizada" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">%</span></span> : <span className="tnum text-ink-soft">{item.rate.toLocaleString("pt-BR")}% a.a.</span>}</td><td className="py-4 text-ink-muted">{item.risk}</td><td className="py-4 text-ink-soft"><Clock3 className="mr-1.5 inline size-4 text-accent" />{formatDuration(item.months)}</td><td className="tnum py-4 text-right font-semibold text-ink">{formatBRL(item.inHorizon)}</td></tr>)}</tbody></table></div>
          <p className="mt-4 text-xs leading-relaxed text-ink-muted">&quot;Prazo p/ meta&quot; é quanto falta para atingir o valor desejado no aporte atual; &quot;Saldo em {horizonYears} {horizonYears === 1 ? "ano" : "anos"}&quot; mostra quanto o dinheiro pode virar nesse período. Simulação educacional com juros compostos e aportes mensais — taxas são hipóteses editáveis, não cotações atuais. Valores brutos, sem descontar inflação, impostos, taxas, risco de crédito ou oscilações.</p>
        </GlassCard>

        <GlassCard variant="liquid" className="col-span-12 xl:col-span-4">
          <h2 className="flex items-center gap-2 font-semibold text-ink"><CircleDollarSign className="size-5 text-accent" />Registrar evento</h2>
          <form className="mt-4 grid gap-4" onSubmit={addEvent}>
            <label className="field-label">Tipo<select className="field" name="event_type" value={eventType} onChange={(event) => setEventType(event.target.value as typeof eventType)}><option value="contribution">Aporte</option><option value="withdrawal">Retirada</option><option value="note">Nota ou acontecimento</option></select></label>
            {eventType !== "note" && <label className="field-label">Valor<MoneyInput name="amount" placeholder="0,00" required /></label>}
            <label className="field-label">Data<input className="field" name="occurred_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
            <label className="field-label">Descrição<input className="field" name="description" maxLength={400} placeholder="Ex.: aporte do salário" /></label>
            <button className="btn-primary" type="submit" disabled={eventSaving}>{eventSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}Adicionar à linha do tempo</button>
          </form>
        </GlassCard>

        <GlassCard className="col-span-12">
          <h2 className="flex items-center gap-2 font-semibold text-ink"><CalendarDays className="size-5 text-accent" />Linha do tempo</h2>
          {selectedEvents.length === 0 ? <p className="mt-4 text-sm text-ink-muted">Nenhum evento registrado. Adicione o primeiro aporte ou uma nota importante.</p> : <ol className="mt-5 grid gap-3 md:grid-cols-2">{selectedEvents.map((item) => <li key={item.id} className="surface-card flex gap-3 rounded-2xl p-4"><span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${item.event_type === "withdrawal" ? "bg-rose-400/10 text-neg" : item.event_type === "contribution" ? "bg-emerald-400/10 text-pos" : "bg-accent/10 text-accent"}`}>{item.event_type === "withdrawal" ? <ArrowDown className="size-4" /> : item.event_type === "contribution" ? <ArrowUp className="size-4" /> : <Check className="size-4" />}</span><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-ink">{item.event_type === "contribution" ? "Aporte" : item.event_type === "withdrawal" ? "Retirada" : "Nota"}</p>{item.amount !== null && <span className="tnum text-sm font-semibold text-accent">{formatBRL(item.amount)}</span>}</div><p className="mt-0.5 text-xs text-ink-muted">{new Date(`${item.occurred_on}T12:00:00`).toLocaleDateString("pt-BR")}</p>{item.description && <p className="mt-2 text-sm text-ink-soft">{item.description}</p>}</div></li>)}</ol>}
        </GlassCard>
      </BentoGrid>}

      <GoalManageDialog goal={managedGoal} onClose={() => setManagedGoal(null)} onChanged={loadData} />
    </section>
  );
}
