import type { Modo, PontoSerie } from "@/lib/mock/types";
import type { Vencimento } from "@/lib/mock/overview";
import type { GastoCategoria } from "@/lib/mock/gastos";
import type { Cartao } from "@/lib/mock/cartoes";
import type { Posicao } from "@/lib/mock/investimentos";
import type { Transacao } from "@/lib/mock/transacoes";
import type { ContaPlanejada, RecorrenciaAtiva } from "@/lib/mock/planejamento";

export type {
  Cartao,
  ContaPlanejada,
  GastoCategoria,
  Posicao,
  RecorrenciaAtiva,
  Transacao,
  Vencimento,
};

/**
 * Estado inicial real de uma conta nova.
 * Os dados de demonstração continuam isolados em lib/mock e nunca são exibidos
 * para uma sessão autenticada.
 */
export const saldoHistorico: PontoSerie[] = [];
export const proximosVencimentos: Vencimento[] = [];
export const overviewKpis = {
  saldoMes: 0,
  trendSaldo: 0,
  entradas: 0,
  trendEntradas: 0,
  saidas: 0,
  trendSaidas: 0,
  economiaPct: 0,
  trendEconomia: 0,
};

export const fluxoAnual: PontoSerie[] = [];
export const fluxoMensal: PontoSerie[] = [];
export function getFluxo(modo: Modo): PontoSerie[] {
  return modo === "anual" ? fluxoAnual : fluxoMensal;
}
export const fluxoKpis = {
  entradas: 0,
  saidas: 0,
  saldo: 0,
  economiaPct: 0,
  trendSaldo: 0,
  trendEntradas: 0,
  trendSaidas: 0,
};

export const gastosPorCategoria: GastoCategoria[] = [];
export const gastosTotal = 0;
export const gastosHistorico: Array<{ periodo: string; gastos: number }> = [];

export const cartoes: Cartao[] = [];
export const faturasHistorico: PontoSerie[] = [];
export const cartoesKpis = {
  limiteTotal: 0,
  limiteUsado: 0,
  faturasEmAberto: 0,
  proximoVencimento: "—",
};

export const evolucaoPatrimonial: PontoSerie[] = [];
export const alocacao: Array<{ name: string; value: number; color?: string }> = [];
export const posicoes: Posicao[] = [];
export const investimentosKpis = {
  patrimonio: 0,
  investido: 0,
  rentabilidade: 0,
  ganho: 0,
  trendMes: 0,
};

export const uberDiario: PontoSerie[] = [];
export const uberMensal: PontoSerie[] = [];
export function getUber(modo: Modo): PontoSerie[] {
  return modo === "anual" ? uberMensal : uberDiario;
}
export const uberKpis = {
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

export const transacoes: Transacao[] = [];
export const contasPlanejadas: ContaPlanejada[] = [];
export const recorrencias: RecorrenciaAtiva[] = [];
