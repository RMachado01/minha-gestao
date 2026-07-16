"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "./client";
import type { GastoCategoria } from "@/lib/mock/gastos";
import type { PontoSerie } from "@/lib/mock/types";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface TxRow {
  type: "income" | "expense" | "benefit";
  amount: number;
  occurred_on: string;
  category: string;
}

interface MonthTotals {
  entradas: number;
  saidas: number;
  /** Saídas + benefícios (VR/VA) — usado na composição de Gastos. */
  gastos: number;
}

function emptyMonth(): MonthTotals {
  return { entradas: 0, saidas: 0, gastos: 0 };
}

function pct(atual: number, anterior: number): number {
  if (anterior === 0) return 0;
  return (atual - anterior) / anterior;
}

/** Chave "YYYY-MM" em horário local — evita o off-by-one de .toISOString() em fusos positivos. */
function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export interface FinanceSummary {
  loading: boolean;
  error: string;
  fluxoMensal: PontoSerie[];
  fluxoAnual: PontoSerie[];
  fluxoKpis: {
    entradas: number;
    saidas: number;
    saldo: number;
    economiaPct: number;
    trendSaldo: number;
    trendEntradas: number;
    trendSaidas: number;
  };
  gastosPorCategoria: GastoCategoria[];
  gastosTotal: number;
  gastosHistorico: Array<{ periodo: string; gastos: number }>;
}

const EMPTY_SUMMARY: FinanceSummary = {
  loading: true,
  error: "",
  fluxoMensal: [],
  fluxoAnual: [],
  fluxoKpis: { entradas: 0, saidas: 0, saldo: 0, economiaPct: 0, trendSaldo: 0, trendEntradas: 0, trendSaidas: 0 },
  gastosPorCategoria: [],
  gastosTotal: 0,
  gastosHistorico: [],
};

/**
 * Agrega a tabela `transactions` em tempo real para alimentar Fluxo de Caixa
 * e Composição de Gastos — as duas telas derivam exatamente dos mesmos
 * lançamentos, em vez de fontes de dados separadas e desconectadas.
 *
 * "Saídas" (fluxo de caixa) considera só `expense`: VR/VA é crédito de
 * benefício, não sai da conta corrente. "Gastos" (composição por categoria)
 * inclui `expense` + `benefit`, pois ambos representam consumo real.
 */
export function useFinanceSummary(): FinanceSummary {
  const [summary, setSummary] = useState<FinanceSummary>(EMPTY_SUMMARY);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setSummary({ ...EMPTY_SUMMARY, loading: false, error: "Supabase não configurado." });
      return;
    }

    const now = new Date();
    const year = now.getFullYear();
    const rangeStart = `${year - 1}-12-01`;
    const rangeEnd = now.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("transactions")
      .select("type,amount,occurred_on,category")
      .gte("occurred_on", rangeStart)
      .lte("occurred_on", rangeEnd)
      .limit(5000);

    if (error) {
      setSummary({ ...EMPTY_SUMMARY, loading: false, error: "Não foi possível carregar seus lançamentos." });
      return;
    }

    const rows = (data ?? []) as TxRow[];

    const byMonth = new Map<string, MonthTotals>();
    for (const row of rows) {
      const key = row.occurred_on.slice(0, 7);
      const bucket = byMonth.get(key) ?? emptyMonth();
      const amount = Number(row.amount);
      if (row.type === "income") bucket.entradas += amount;
      if (row.type === "expense") bucket.saidas += amount;
      if (row.type === "expense" || row.type === "benefit") bucket.gastos += amount;
      byMonth.set(key, bucket);
    }

    const currentMonthKey = monthKeyOf(now);
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = monthKeyOf(prevMonthDate);

    const currentTotals = byMonth.get(currentMonthKey) ?? emptyMonth();
    const prevTotals = byMonth.get(prevMonthKey) ?? emptyMonth();
    const saldoAtual = currentTotals.entradas - currentTotals.saidas;
    const saldoAnterior = prevTotals.entradas - prevTotals.saidas;

    const fluxoKpis = {
      entradas: currentTotals.entradas,
      saidas: currentTotals.saidas,
      saldo: saldoAtual,
      economiaPct: currentTotals.entradas > 0 ? saldoAtual / currentTotals.entradas : 0,
      trendSaldo: pct(saldoAtual, saldoAnterior),
      trendEntradas: pct(currentTotals.entradas, prevTotals.entradas),
      trendSaidas: pct(currentTotals.saidas, prevTotals.saidas),
    };

    // Fluxo anual: Jan–Dez do ano corrente.
    const fluxoAnual: PontoSerie[] = MONTH_LABELS.map((label, index) => {
      const key = `${year}-${String(index + 1).padStart(2, "0")}`;
      const totals = byMonth.get(key) ?? emptyMonth();
      return { periodo: label, entradas: totals.entradas, saidas: totals.saidas, saldo: totals.entradas - totals.saidas };
    });

    // Fluxo mensal: 4 semanas do mês corrente (dias 29-31 caem na semana 4).
    const weekBuckets: MonthTotals[] = [emptyMonth(), emptyMonth(), emptyMonth(), emptyMonth()];
    for (const row of rows) {
      if (row.occurred_on.slice(0, 7) !== currentMonthKey) continue;
      const day = Number(row.occurred_on.slice(8, 10));
      const week = Math.min(Math.ceil(day / 7), 4) - 1;
      const amount = Number(row.amount);
      if (row.type === "income") weekBuckets[week].entradas += amount;
      if (row.type === "expense") weekBuckets[week].saidas += amount;
    }
    const fluxoMensal: PontoSerie[] = weekBuckets.map((totals, index) => ({
      periodo: `Sem ${index + 1}`,
      entradas: totals.entradas,
      saidas: totals.saidas,
      saldo: totals.entradas - totals.saidas,
    }));

    // Gastos por categoria (mês corrente, expense + benefit) com tendência vs. mês anterior.
    const currentCategory = new Map<string, { value: number; transacoes: number }>();
    const prevCategory = new Map<string, number>();
    for (const row of rows) {
      if (row.type !== "expense" && row.type !== "benefit") continue;
      const key = row.occurred_on.slice(0, 7);
      const amount = Number(row.amount);
      if (key === currentMonthKey) {
        const bucket = currentCategory.get(row.category) ?? { value: 0, transacoes: 0 };
        bucket.value += amount;
        bucket.transacoes += 1;
        currentCategory.set(row.category, bucket);
      } else if (key === prevMonthKey) {
        prevCategory.set(row.category, (prevCategory.get(row.category) ?? 0) + amount);
      }
    }
    const gastosPorCategoria: GastoCategoria[] = Array.from(currentCategory.entries()).map(
      ([name, { value, transacoes }]) => ({
        name,
        value,
        transacoes,
        trend: pct(value, prevCategory.get(name) ?? 0),
      }),
    );
    const gastosTotal = gastosPorCategoria.reduce((sum, item) => sum + item.value, 0);

    // Histórico de gastos: últimos 6 meses (mês corrente incluso).
    const gastosHistorico: Array<{ periodo: string; gastos: number }> = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKeyOf(d);
      const totals = byMonth.get(key) ?? emptyMonth();
      gastosHistorico.push({ periodo: MONTH_LABELS[d.getMonth()], gastos: totals.gastos });
    }

    setSummary({ loading: false, error: "", fluxoMensal, fluxoAnual, fluxoKpis, gastosPorCategoria, gastosTotal, gastosHistorico });
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  return summary;
}
