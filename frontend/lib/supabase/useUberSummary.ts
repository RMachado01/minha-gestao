"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Modo } from "@/lib/usePeriodo";
import { createClient } from "./client";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface UberEntryRow {
  occurred_on: string;
  kilometers: number | string;
  gross_revenue: number | string;
  energy_or_fuel_cost: number | string;
  other_costs: number | string;
  net_profit: number | string;
}

interface UberTotals {
  receita: number;
  combustivel: number;
  outrosCustos: number;
  lucro: number;
  km: number;
}

export interface UberChartPoint extends Record<string, string | number> {
  periodo: string;
  receita: number;
  combustivel: number;
  lucro: number;
}

export interface UberSummary {
  loading: boolean;
  error: string;
  hasData: boolean;
  comparisonAvailable: boolean;
  data: UberChartPoint[];
  kpis: {
    receitaPeriodo: number;
    combustivelPeriodo: number;
    lucroLiquido: number;
    margemLiquida: number;
    custoCombustivelPct: number;
    trendLucro: number;
    trendMargem: number;
    trendCombustivel: number;
    kmRodados: number;
    custoPorKm: number;
  };
  refresh: () => Promise<void>;
}

const EMPTY_KPIS: UberSummary["kpis"] = {
  receitaPeriodo: 0,
  combustivelPeriodo: 0,
  lucroLiquido: 0,
  margemLiquida: 0,
  custoCombustivelPct: 0,
  trendLucro: 0,
  trendMargem: 0,
  trendCombustivel: 0,
  kmRodados: 0,
  custoPorKm: 0,
};

function dateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function periodRange(mode: Modo) {
  const now = new Date();
  if (mode === "anual") {
    return {
      currentStart: `${now.getFullYear()}-01-01`,
      currentEnd: `${now.getFullYear()}-12-31`,
      previousStart: `${now.getFullYear() - 1}-01-01`,
      previousEnd: `${now.getFullYear() - 1}-12-31`,
    };
  }

  return {
    currentStart: dateKey(new Date(now.getFullYear(), now.getMonth(), 1)),
    currentEnd: dateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    previousStart: dateKey(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    previousEnd: dateKey(new Date(now.getFullYear(), now.getMonth(), 0)),
  };
}

function totalRows(rows: UberEntryRow[]): UberTotals {
  return rows.reduce<UberTotals>((totals, row) => ({
    receita: totals.receita + Number(row.gross_revenue),
    combustivel: totals.combustivel + Number(row.energy_or_fuel_cost),
    outrosCustos: totals.outrosCustos + Number(row.other_costs),
    lucro: totals.lucro + Number(row.net_profit),
    km: totals.km + Number(row.kilometers),
  }), { receita: 0, combustivel: 0, outrosCustos: 0, lucro: 0, km: 0 });
}

function trend(current: number, previous: number): number {
  if (previous === 0) return 0;
  return (current - previous) / Math.abs(previous);
}

function buildChart(rows: UberEntryRow[], mode: Modo): UberChartPoint[] {
  const grouped = new Map<string, UberTotals>();
  for (const row of rows) {
    const key = mode === "anual" ? row.occurred_on.slice(0, 7) : row.occurred_on;
    const current = grouped.get(key) ?? { receita: 0, combustivel: 0, outrosCustos: 0, lucro: 0, km: 0 };
    current.receita += Number(row.gross_revenue);
    current.combustivel += Number(row.energy_or_fuel_cost);
    current.outrosCustos += Number(row.other_costs);
    current.lucro += Number(row.net_profit);
    current.km += Number(row.kilometers);
    grouped.set(key, current);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, totals]) => ({
      periodo: mode === "anual"
        ? MONTH_LABELS[Number(key.slice(5, 7)) - 1]
        : `${key.slice(8, 10)}/${key.slice(5, 7)}`,
      receita: totals.receita,
      combustivel: totals.combustivel,
      lucro: totals.lucro,
    }));
}

export function useUberSummary(mode: Modo): UberSummary {
  const requestIdRef = useRef(0);
  const [state, setState] = useState<Omit<UberSummary, "refresh">>({
    loading: true,
    error: "",
    hasData: false,
    comparisonAvailable: false,
    data: [],
    kpis: EMPTY_KPIS,
  });

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setState((current) => ({ ...current, loading: true, error: "" }));
    const supabase = createClient();
    if (!supabase) {
      setState({ loading: false, error: "Supabase não configurado.", hasData: false, comparisonAvailable: false, data: [], kpis: EMPTY_KPIS });
      return;
    }

    const range = periodRange(mode);
    const { data, error } = await supabase
      .from("uber_daily_entries")
      .select("occurred_on,kilometers,gross_revenue,energy_or_fuel_cost,other_costs,net_profit")
      .eq("entry_kind", "uber")
      .gte("occurred_on", range.previousStart)
      .lte("occurred_on", range.currentEnd)
      .order("occurred_on", { ascending: true })
      .limit(5000);

    if (requestId !== requestIdRef.current) return;

    if (error) {
      const migrationPending = error.code === "42703" || error.code === "PGRST204";
      setState({
        loading: false,
        error: migrationPending
          ? "A atualização do banco para o diário ainda não foi aplicada."
          : "Não foi possível carregar o resumo de trabalho.",
        hasData: false,
        comparisonAvailable: false,
        data: [],
        kpis: EMPTY_KPIS,
      });
      return;
    }

    const rows = (data ?? []) as UberEntryRow[];
    const currentRows = rows.filter((row) => row.occurred_on >= range.currentStart && row.occurred_on <= range.currentEnd);
    const previousRows = rows.filter((row) => row.occurred_on >= range.previousStart && row.occurred_on <= range.previousEnd);
    const current = totalRows(currentRows);
    const previous = totalRows(previousRows);
    const currentMargin = current.receita > 0 ? current.lucro / current.receita : 0;
    const previousMargin = previous.receita > 0 ? previous.lucro / previous.receita : 0;

    setState({
      loading: false,
      error: "",
      hasData: currentRows.length > 0,
      comparisonAvailable: previousRows.length > 0,
      data: buildChart(currentRows, mode),
      kpis: {
        receitaPeriodo: current.receita,
        combustivelPeriodo: current.combustivel,
        lucroLiquido: current.lucro,
        margemLiquida: currentMargin,
        custoCombustivelPct: current.receita > 0 ? current.combustivel / current.receita : 0,
        trendLucro: trend(current.lucro, previous.lucro),
        trendMargem: trend(currentMargin, previousMargin),
        trendCombustivel: trend(current.combustivel, previous.combustivel),
        kmRodados: current.km,
        custoPorKm: current.km > 0 ? (current.combustivel + current.outrosCustos) / current.km : 0,
      },
    });
  }, [mode]);

  useEffect(() => {
    void Promise.resolve().then(refresh);

    const onEntriesChanged = () => { void refresh(); };
    window.addEventListener("mg-uber-entries-changed", onEntriesChanged);
    return () => {
      requestIdRef.current += 1;
      window.removeEventListener("mg-uber-entries-changed", onEntriesChanged);
    };
  }, [refresh]);

  return { ...state, refresh };
}
