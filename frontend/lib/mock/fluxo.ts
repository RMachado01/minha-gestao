import type { Modo, PontoSerie } from "./types";

/** Fluxo de caixa: entradas x saídas x saldo. */

/** Modo anual: 12 meses do ano corrente. */
export const fluxoAnual: PontoSerie[] = [
  { periodo: "Jan", entradas: 8200, saidas: 5400, saldo: 2800 },
  { periodo: "Fev", entradas: 7800, saidas: 6100, saldo: 1700 },
  { periodo: "Mar", entradas: 9100, saidas: 5900, saldo: 3200 },
  { periodo: "Abr", entradas: 8600, saidas: 6800, saldo: 1800 },
  { periodo: "Mai", entradas: 8900, saidas: 5600, saldo: 3300 },
  { periodo: "Jun", entradas: 9400, saidas: 7200, saldo: 2200 },
  { periodo: "Jul", entradas: 8700, saidas: 5300, saldo: 3400 },
  { periodo: "Ago", entradas: 9600, saidas: 6400, saldo: 3200 },
  { periodo: "Set", entradas: 8800, saidas: 5900, saldo: 2900 },
  { periodo: "Out", entradas: 10200, saidas: 6700, saldo: 3500 },
  { periodo: "Nov", entradas: 9300, saidas: 6100, saldo: 3200 },
  { periodo: "Dez", entradas: 11800, saidas: 8300, saldo: 3500 },
];

/** Modo mensal: 4 semanas do mês corrente. */
export const fluxoMensal: PontoSerie[] = [
  { periodo: "Sem 1", entradas: 2400, saidas: 1500, saldo: 900 },
  { periodo: "Sem 2", entradas: 2100, saidas: 1800, saldo: 300 },
  { periodo: "Sem 3", entradas: 2600, saidas: 1200, saldo: 1400 },
  { periodo: "Sem 4", entradas: 1600, saidas: 800, saldo: 800 },
];

export function getFluxo(modo: Modo): PontoSerie[] {
  return modo === "anual" ? fluxoAnual : fluxoMensal;
}

/** KPIs do mês corrente (Julho) comparado ao anterior (Junho). */
export const fluxoKpis = {
  entradas: 8700,
  saidas: 5300,
  saldo: 3400,
  economiaPct: 0.39, // saldo / entradas
  trendSaldo: 0.545, // 3400 vs 2200 do mês anterior
  trendEntradas: -0.074,
  trendSaidas: -0.264,
};
