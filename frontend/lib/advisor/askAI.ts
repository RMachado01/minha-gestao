import type { FinancialGoal, TransactionSummary } from "@/lib/goals";
import { formatBRL } from "@/lib/format";

interface AdvisorData {
  transactions: TransactionSummary[];
  goals: FinancialGoal[];
  investmentTotal: number;
  creditCardBills: number;
  benefitBalance: number;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Monta um resumo compacto e legível dos dados da conta para enviar ao LLM.
 * Envia agregados (totais e categorias do mês), nunca a lista bruta de
 * transações — mais barato em tokens e menos exposição de dados.
 */
export function buildAdvisorContext(data: AdvisorData): string {
  const now = monthKey(new Date());
  const doMes = data.transactions.filter((t) => t.occurred_on.slice(0, 7) === now);
  const entradas = doMes.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const saidas = doMes.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const saldo = entradas - saidas;
  const taxaEconomia = entradas > 0 ? Math.round(((entradas - saidas) / entradas) * 100) : 0;

  const porCategoria = new Map<string, number>();
  for (const t of doMes) {
    if (t.type === "expense") porCategoria.set(t.category, (porCategoria.get(t.category) ?? 0) + t.amount);
  }
  const topCategorias = [...porCategoria.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([nome, valor]) => `${nome}: ${formatBRL(valor)}`)
    .join("; ");

  const metas = data.goals
    .slice(0, 5)
    .map((g) => `${g.name} (${formatBRL(g.current_amount)} de ${formatBRL(g.target_amount)})`)
    .join("; ");

  const linhas = [
    `Mês atual: ${now}`,
    `Entradas do mês: ${formatBRL(entradas)}`,
    `Saídas do mês: ${formatBRL(saidas)}`,
    `Saldo do mês: ${formatBRL(saldo)}`,
    `Taxa de economia: ${taxaEconomia}%`,
    `Total investido: ${formatBRL(data.investmentTotal)}`,
    `Faturas de cartão em aberto: ${formatBRL(data.creditCardBills)}`,
    `Saldo de benefícios (VR/VA): ${formatBRL(data.benefitBalance)}`,
    topCategorias ? `Maiores gastos por categoria: ${topCategorias}` : "Sem gastos por categoria no mês.",
    metas ? `Metas: ${metas}` : "Nenhuma meta cadastrada.",
  ];
  return linhas.join("\n");
}

/**
 * Pergunta ao assistente de IA (Groq, via rota server-side). Retorna a resposta
 * ou `null` quando a IA não está configurada/indisponível — nesse caso o chamador
 * deve cair no modo baseado em regras.
 */
export async function askAdvisorAI(question: string, context: string): Promise<string | null> {
  try {
    const res = await fetch("/api/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, context }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { answer?: string };
    return typeof data.answer === "string" && data.answer.trim() ? data.answer.trim() : null;
  } catch {
    return null;
  }
}
