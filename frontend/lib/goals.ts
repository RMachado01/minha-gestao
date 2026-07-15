export type GoalType = "reserve" | "vehicle" | "home" | "travel" | "education" | "retirement" | "other";
export type ContributionMode = "fixed" | "percentage";
export type GoalStatus = "active" | "paused" | "completed" | "cancelled";
export type ScenarioId = "savings" | "cdb" | "treasury" | "dividends" | "custom";

export interface FinancialGoal {
  id: string;
  user_id: string;
  name: string;
  goal_type: GoalType;
  description: string | null;
  target_amount: number;
  current_amount: number;
  contribution_mode: ContributionMode;
  contribution_value: number;
  target_date: string | null;
  preferred_scenario: ScenarioId;
  custom_annual_rate: number | null;
  status: GoalStatus;
  created_at: string;
}

export interface GoalEvent {
  id: string;
  goal_id: string;
  event_type: "contribution" | "withdrawal" | "milestone" | "note";
  amount: number | null;
  description: string | null;
  occurred_on: string;
  created_at: string;
}

export interface TransactionSummary {
  type: "income" | "expense" | "benefit";
  amount: number;
  occurred_on: string;
  category: string;
}

export const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: "reserve", label: "Reserva de segurança" },
  { value: "vehicle", label: "Carro" },
  { value: "home", label: "Casa ou imóvel" },
  { value: "travel", label: "Viagem" },
  { value: "education", label: "Educação" },
  { value: "retirement", label: "Aposentadoria" },
  { value: "other", label: "Outro sonho" },
];

/** Taxas nominais apenas ilustrativas. O usuário pode ajustar o cenário personalizado. */
export const INVESTMENT_SCENARIOS: { id: ScenarioId; name: string; annualRate: number; risk: string }[] = [
  { id: "savings", name: "Poupança", annualRate: 6, risk: "Baixo" },
  { id: "cdb", name: "CDB", annualRate: 9, risk: "Baixo a médio" },
  { id: "treasury", name: "Tesouro Direto", annualRate: 8, risk: "Baixo a médio" },
  { id: "dividends", name: "Ações e dividendos", annualRate: 11, risk: "Alto" },
  { id: "custom", name: "Cenário personalizado", annualRate: 7, risk: "Definido por você" },
];

export function monthlyContribution(goal: FinancialGoal, averageMonthlyIncome: number): number {
  return goal.contribution_mode === "fixed"
    ? goal.contribution_value
    : averageMonthlyIncome * (goal.contribution_value / 100);
}

export function futureValue(current: number, monthly: number, annualRatePercent: number, months: number): number {
  const monthlyRate = Math.pow(1 + annualRatePercent / 100, 1 / 12) - 1;
  if (monthlyRate === 0) return current + monthly * months;
  const factor = Math.pow(1 + monthlyRate, months);
  return current * factor + monthly * ((factor - 1) / monthlyRate);
}

export function monthsToTarget(current: number, target: number, monthly: number, annualRatePercent: number): number | null {
  if (current >= target) return 0;
  if (monthly <= 0 && annualRatePercent <= 0) return null;
  for (let month = 1; month <= 600; month += 1) {
    if (futureValue(current, monthly, annualRatePercent, month) >= target) return month;
  }
  return null;
}

export function formatDuration(months: number | null): string {
  if (months === null) return "Mais de 50 anos";
  if (months === 0) return "Meta alcançada";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (!years) return `${rest} ${rest === 1 ? "mês" : "meses"}`;
  if (!rest) return `${years} ${years === 1 ? "ano" : "anos"}`;
  return `${years} ${years === 1 ? "ano" : "anos"} e ${rest} ${rest === 1 ? "mês" : "meses"}`;
}

export function averageIncome(transactions: TransactionSummary[]): number {
  const monthly = new Map<string, number>();
  for (const item of transactions) {
    if (item.type !== "income") continue;
    const month = item.occurred_on.slice(0, 7);
    monthly.set(month, (monthly.get(month) ?? 0) + item.amount);
  }
  const values = [...monthly.values()];
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function answerFinancialQuestion(
  question: string,
  transactions: TransactionSummary[],
  goals: FinancialGoal[],
  selectedGoal: FinancialGoal | null,
  investmentTotal: number,
): string {
  const normalized = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const balance = income - expenses;
  const avgIncome = averageIncome(transactions);
  const currency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (!transactions.length && !goals.length && investmentTotal === 0) {
    return "Ainda não há dados suficientes na sua conta. Cadastre receitas, despesas e uma meta; depois eu consigo calcular seu saldo, capacidade de aporte e prazo estimado.";
  }

  if (/saldo|quanto tenho|sobra|sobrou/.test(normalized)) {
    return `Nos lançamentos disponíveis, suas receitas somam ${currency(income)} e as despesas ${currency(expenses)}, deixando saldo calculado de ${currency(balance)}. Esse valor considera apenas o que está registrado.`;
  }

  if (/gasto|despesa|categoria|onde/.test(normalized)) {
    const categories = new Map<string, number>();
    transactions.filter((item) => item.type === "expense").forEach((item) => categories.set(item.category, (categories.get(item.category) ?? 0) + item.amount));
    const largest = [...categories.entries()].sort((a, b) => b[1] - a[1])[0];
    return largest
      ? `Sua maior categoria de despesas é ${largest[0]}, com ${currency(largest[1])}. Suas despesas registradas totalizam ${currency(expenses)}.`
      : "Você ainda não possui despesas registradas para eu comparar por categoria.";
  }

  if (/invest|patrimonio|aplic/.test(normalized)) {
    return `Você possui ${currency(investmentTotal)} em aplicações cadastradas. As taxas exibidas nas metas são hipóteses editáveis de simulação, não recomendações nem garantia de retorno.`;
  }

  if (/prazo|tempo|quando|alcanc|ating/.test(normalized) && selectedGoal) {
    const monthly = monthlyContribution(selectedGoal, avgIncome);
    const scenario = INVESTMENT_SCENARIOS.find((item) => item.id === selectedGoal.preferred_scenario) ?? INVESTMENT_SCENARIOS[1];
    const rate = selectedGoal.preferred_scenario === "custom" ? selectedGoal.custom_annual_rate ?? scenario.annualRate : scenario.annualRate;
    const months = monthsToTarget(selectedGoal.current_amount, selectedGoal.target_amount, monthly, rate);
    return `Para “${selectedGoal.name}”, com aporte estimado de ${currency(monthly)} por mês e hipótese de ${rate.toLocaleString("pt-BR")}% ao ano, o prazo simulado é ${formatDuration(months)}. Impostos, inflação e oscilações não estão descontados.`;
  }

  if (/aporte|guardar|economizar|porcent/.test(normalized)) {
    const planned = goals.filter((goal) => goal.status === "active").reduce((sum, goal) => sum + monthlyContribution(goal, avgIncome), 0);
    return `Seus aportes ativos planejados somam ${currency(planned)} por mês. Sua renda mensal média registrada é ${currency(avgIncome)}; portanto, o comprometimento estimado é ${avgIncome > 0 ? `${((planned / avgIncome) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "indisponível até haver receitas"}.`;
  }

  if (/meta|sonho|objetivo/.test(normalized)) {
    const active = goals.filter((goal) => goal.status === "active");
    const remaining = active.reduce((sum, goal) => sum + Math.max(0, goal.target_amount - goal.current_amount), 0);
    return `Você tem ${active.length} ${active.length === 1 ? "meta ativa" : "metas ativas"} e ainda precisa acumular ${currency(remaining)} para concluí-las. Selecione uma meta para obter uma projeção específica.`;
  }

  return `Resumo da sua conta: saldo calculado de ${currency(balance)}, ${currency(investmentTotal)} em investimentos e ${goals.filter((goal) => goal.status === "active").length} metas ativas. Posso responder sobre saldo, gastos, maior categoria, aportes, investimentos ou prazo da meta selecionada.`;
}
