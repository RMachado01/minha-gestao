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

export interface AdvisorAccountContext {
  creditCardBills?: number;
  benefitBalance?: number;
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
  account: AdvisorAccountContext = {},
): string {
  const normalized = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenseItems = transactions.filter((item) => item.type === "expense" || item.type === "benefit");
  const expenses = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const balance = income - expenses;
  const avgIncome = averageIncome(transactions);
  const currency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const monthly = new Map<string, { income: number; expenses: number }>();
  for (const item of transactions) {
    const month = item.occurred_on.slice(0, 7);
    const current = monthly.get(month) ?? { income: 0, expenses: 0 };
    if (item.type === "income") current.income += item.amount;
    else current.expenses += item.amount;
    monthly.set(month, current);
  }
  const months = [...monthly.keys()].sort().reverse();
  const currentMonth = monthly.get(months[0] ?? "") ?? { income: 0, expenses: 0 };
  const previousMonth = monthly.get(months[1] ?? "") ?? { income: 0, expenses: 0 };

  if (!transactions.length && !goals.length && investmentTotal === 0) {
    return "Ainda não há dados suficientes na sua conta. Cadastre receitas, despesas e uma meta; depois eu consigo calcular seu saldo, capacidade de aporte e prazo estimado.";
  }

  if (/saldo|quanto tenho|sobra|sobrou/.test(normalized)) {
    return `Nos lançamentos disponíveis, suas receitas somam ${currency(income)} e as despesas ${currency(expenses)}, deixando saldo calculado de ${currency(balance)}. Você ainda tem ${currency(account.benefitBalance ?? 0)} em VR/VA. Valores consideram apenas registros da conta.`;
  }

  if (/gasto|despesa|categoria|onde/.test(normalized)) {
    const categories = new Map<string, number>();
    expenseItems.forEach((item) => categories.set(item.category, (categories.get(item.category) ?? 0) + item.amount));
    const largest = [...categories.entries()].sort((a, b) => b[1] - a[1])[0];
    return largest
      ? `Sua maior categoria de despesas é ${largest[0]}, com ${currency(largest[1])}. Suas despesas registradas totalizam ${currency(expenses)}.`
      : "Você ainda não possui despesas registradas para eu comparar por categoria.";
  }

  if (/mes|mensal|compar|evolu|aument|diminui/.test(normalized)) {
    if (months.length < 2) return `O mês mais recente tem ${currency(currentMonth.income)} de receitas e ${currency(currentMonth.expenses)} de despesas. Preciso de pelo menos dois meses para comparar a evolução.`;
    const delta = previousMonth.expenses > 0 ? ((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100 : null;
    return `No mês mais recente: ${currency(currentMonth.income)} de receitas e ${currency(currentMonth.expenses)} de despesas. Gastos ${delta === null ? "não têm base anterior comparável" : `${delta > 0 ? "subiram" : "caíram"} ${Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% frente ao mês anterior`}.`;
  }

  if (/taxa|econom|poup|capacidade/.test(normalized)) {
    const rate = currentMonth.income > 0 ? ((currentMonth.income - currentMonth.expenses) / currentMonth.income) * 100 : null;
    return rate === null ? "Cadastre receitas no mês para eu calcular sua taxa de economia." : `Sua taxa de economia no mês mais recente é ${rate.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%, equivalente a ${currency(currentMonth.income - currentMonth.expenses)}. Aportes planejados nas metas devem caber nessa sobra.`;
  }

  if (/cartao|fatura|vr|va|aliment/.test(normalized)) {
    return `Faturas de crédito do mês somam ${currency(account.creditCardBills ?? 0)}. Saldo disponível em cartões VR/VA: ${currency(account.benefitBalance ?? 0)}. Compras VR/VA são despesas de Alimentação e reduzem esse saldo; não contam como renda.`;
  }

  if (/reserva|emerg/.test(normalized)) {
    const avgExpenses = months.length ? [...monthly.values()].reduce((sum, item) => sum + item.expenses, 0) / months.length : 0;
    return avgExpenses > 0 ? `Seu gasto mensal médio registrado é ${currency(avgExpenses)}. Uma faixa ilustrativa de 3 a 6 meses seria ${currency(avgExpenses * 3)} a ${currency(avgExpenses * 6)}. Ajuste conforme estabilidade de renda, dependentes e riscos.` : "Cadastre despesas de alguns meses para eu estimar uma faixa de reserva de emergência.";
  }

  if (/posso comprar|posso gastar|cabe|viavel/.test(normalized)) {
    const planned = goals.filter((goal) => goal.status === "active").reduce((sum, goal) => sum + monthlyContribution(goal, avgIncome), 0);
    const freeCash = currentMonth.income - currentMonth.expenses - planned;
    return `Após gastos do mês e aportes planejados, sua margem estimada é ${currency(freeCash)}. Isso é uma triagem, não aprovação de compra: confirme parcelas futuras, reserva e faturas antes de decidir.`;
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

  return `Resumo: saldo calculado ${currency(balance)}, investimentos ${currency(investmentTotal)}, faturas ${currency(account.creditCardBills ?? 0)}, VR/VA ${currency(account.benefitBalance ?? 0)} e ${goals.filter((goal) => goal.status === "active").length} metas ativas. Pergunte sobre comparação mensal, taxa de economia, reserva, gastos, cartões, aportes ou prazo de uma meta.`;
}
