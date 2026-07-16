"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "./client";
import type { PontoSerie } from "@/lib/mock/types";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export type InvestmentType = "renda_fixa" | "renda_variavel" | "fundo" | "cripto" | "outro";

export const INVESTMENT_TYPE_LABEL: Record<InvestmentType, string> = {
  renda_fixa: "Renda fixa",
  renda_variavel: "Renda variável",
  fundo: "Fundos",
  cripto: "Cripto",
  outro: "Outros",
};

export interface InvestmentPosition {
  id: string;
  nome: string;
  tipo: InvestmentType;
  ticker: string | null;
  instituicao: string;
  investido: number;
  atual: number;
  proventos: number;
  applicationDate: string;
  maturityDate: string | null;
  notes: string | null;
}

export interface InvestmentIncomeEntry {
  id: string;
  investmentId: string;
  investmentName: string;
  type: "dividendo" | "jcp" | "rendimento" | "juros" | "outro";
  amount: number;
  paymentDate: string;
  notes: string | null;
}

export interface InvestmentsSummary {
  loading: boolean;
  error: string;
  positions: InvestmentPosition[];
  evolucaoPatrimonial: PontoSerie[];
  alocacao: Array<{ name: string; value: number }>;
  proventosRecentes: InvestmentIncomeEntry[];
  kpis: {
    patrimonio: number;
    investido: number;
    ganho: number;
    rentabilidade: number;
    trendMes: number;
    proventosMes: number;
    proventosTotal: number;
  };
  refresh: () => Promise<void>;
}

/** Chave "YYYY-MM" em horário local — evita off-by-one de .toISOString() em fusos positivos. */
function monthKeyOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return MONTH_LABELS[d.getMonth()];
}

const EMPTY: Omit<InvestmentsSummary, "refresh"> = {
  loading: true,
  error: "",
  positions: [],
  evolucaoPatrimonial: [],
  alocacao: [],
  proventosRecentes: [],
  kpis: { patrimonio: 0, investido: 0, ganho: 0, rentabilidade: 0, trendMes: 0, proventosMes: 0, proventosTotal: 0 },
};

export function useInvestments(): InvestmentsSummary {
  const [state, setState] = useState(EMPTY);

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    const supabase = createClient();
    if (!supabase) {
      setState({ ...EMPTY, loading: false, error: "Supabase não configurado." });
      return;
    }

    const [invRes, snapRes, incomeRes] = await Promise.all([
      supabase
        .from("investments")
        .select("id,name,type,invested_amount,application_date,institution,ticker,maturity_date,notes")
        .eq("archived", false)
        .order("application_date", { ascending: false }),
      supabase.from("investment_snapshots").select("investment_id,snapshot_date,current_value").order("snapshot_date", { ascending: true }),
      supabase
        .from("investment_income")
        .select("id,investment_id,type,amount,payment_date,notes")
        .order("payment_date", { ascending: false }),
    ]);

    if (invRes.error || snapRes.error || incomeRes.error) {
      setState({ ...EMPTY, loading: false, error: "Não foi possível carregar seus investimentos." });
      return;
    }

    const investments = invRes.data ?? [];
    const snapshots = snapRes.data ?? [];
    const income = incomeRes.data ?? [];

    // Último snapshot conhecido por posição.
    const latestByInvestment = new Map<string, number>();
    for (const snap of snapshots) latestByInvestment.set(snap.investment_id, Number(snap.current_value));

    const incomeByInvestment = new Map<string, number>();
    for (const entry of income) {
      incomeByInvestment.set(entry.investment_id, (incomeByInvestment.get(entry.investment_id) ?? 0) + Number(entry.amount));
    }

    const nameById = new Map(investments.map((inv) => [inv.id, inv.name] as const));

    const positions: InvestmentPosition[] = investments.map((inv) => ({
      id: inv.id,
      nome: inv.name,
      tipo: inv.type as InvestmentType,
      ticker: inv.ticker,
      instituicao: inv.institution,
      investido: Number(inv.invested_amount),
      atual: latestByInvestment.get(inv.id) ?? Number(inv.invested_amount),
      proventos: incomeByInvestment.get(inv.id) ?? 0,
      applicationDate: inv.application_date,
      maturityDate: inv.maturity_date,
      notes: inv.notes,
    }));

    const patrimonio = positions.reduce((sum, p) => sum + p.atual, 0);
    const investido = positions.reduce((sum, p) => sum + p.investido, 0);
    const ganho = patrimonio - investido;
    const rentabilidade = investido > 0 ? ganho / investido : 0;

    // Evolução patrimonial: agrega todos os snapshots por mês (investido + atual).
    const byMonth = new Map<string, { periodo: string; investido: number; atual: number; order: string }>();
    const investedAtSnapByMonth = new Map<string, number>();
    for (const snap of snapshots) {
      const key = monthKeyOf(snap.snapshot_date);
      const entry = byMonth.get(key) ?? { periodo: monthLabelOf(snap.snapshot_date), investido: 0, atual: 0, order: key };
      entry.atual += Number(snap.current_value);
      byMonth.set(key, entry);
    }
    for (const inv of investments) {
      const key = monthKeyOf(inv.application_date);
      investedAtSnapByMonth.set(key, (investedAtSnapByMonth.get(key) ?? 0) + Number(inv.invested_amount));
    }
    const sortedKeys = Array.from(byMonth.keys()).sort();
    let runningInvested = 0;
    const evolucaoPatrimonial: PontoSerie[] = sortedKeys.map((key) => {
      runningInvested += investedAtSnapByMonth.get(key) ?? 0;
      const entry = byMonth.get(key)!;
      return { periodo: entry.periodo, investido: runningInvested, atual: entry.atual };
    });

    const trendMes = (() => {
      if (evolucaoPatrimonial.length < 2) return 0;
      const last = Number(evolucaoPatrimonial[evolucaoPatrimonial.length - 1].atual);
      const prev = Number(evolucaoPatrimonial[evolucaoPatrimonial.length - 2].atual);
      return prev === 0 ? 0 : (last - prev) / prev;
    })();

    const alocacaoMap = new Map<string, number>();
    for (const p of positions) alocacaoMap.set(INVESTMENT_TYPE_LABEL[p.tipo] ?? "Outros", (alocacaoMap.get(INVESTMENT_TYPE_LABEL[p.tipo]) ?? 0) + p.atual);
    const alocacao = Array.from(alocacaoMap.entries()).map(([name, value]) => ({ name, value }));

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const proventosMes = income.filter((entry) => monthKeyOf(entry.payment_date) === currentMonthKey).reduce((sum, entry) => sum + Number(entry.amount), 0);
    const proventosTotal = income.reduce((sum, entry) => sum + Number(entry.amount), 0);

    const proventosRecentes: InvestmentIncomeEntry[] = income.slice(0, 8).map((entry) => ({
      id: entry.id,
      investmentId: entry.investment_id,
      investmentName: nameById.get(entry.investment_id) ?? "—",
      type: entry.type,
      amount: Number(entry.amount),
      paymentDate: entry.payment_date,
      notes: entry.notes,
    }));

    setState({
      loading: false,
      error: "",
      positions,
      evolucaoPatrimonial,
      alocacao,
      proventosRecentes,
      kpis: { patrimonio, investido, ganho, rentabilidade, trendMes, proventosMes, proventosTotal },
    });
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  return { ...state, refresh };
}
