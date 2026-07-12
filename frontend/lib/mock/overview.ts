import type { PontoSerie } from "./types";

/** Visão Geral (Home). */

/** Evolução do saldo — últimos 12 meses (para o mini-gráfico do hero). */
export const saldoHistorico: PontoSerie[] = [
  { periodo: "Ago", saldo: 3200 },
  { periodo: "Set", saldo: 2900 },
  { periodo: "Out", saldo: 3500 },
  { periodo: "Nov", saldo: 3200 },
  { periodo: "Dez", saldo: 3500 },
  { periodo: "Jan", saldo: 2800 },
  { periodo: "Fev", saldo: 1700 },
  { periodo: "Mar", saldo: 3200 },
  { periodo: "Abr", saldo: 1800 },
  { periodo: "Mai", saldo: 3300 },
  { periodo: "Jun", saldo: 2200 },
  { periodo: "Jul", saldo: 3400 },
];

export const overviewKpis = {
  saldoMes: 3400,
  trendSaldo: 0.545,
  entradas: 8700,
  trendEntradas: -0.074,
  saidas: 5300,
  trendSaidas: -0.264,
  economiaPct: 0.39,
  trendEconomia: 0.12,
};

export interface Vencimento {
  descricao: string;
  categoria: string;
  valor: number;
  vence: string; // dd/mm
  tipo: "cartao" | "assinatura" | "conta";
}

/** Próximos vencimentos (assinaturas, parcelas, contas, faturas). */
export const proximosVencimentos: Vencimento[] = [
  { descricao: "Fatura Nubank", categoria: "Cartão", valor: 1840.32, vence: "15/07", tipo: "cartao" },
  { descricao: "Aluguel", categoria: "Moradia", valor: 1650.0, vence: "10/07", tipo: "conta" },
  { descricao: "Fatura Itaú", categoria: "Cartão", valor: 920.5, vence: "18/07", tipo: "cartao" },
  { descricao: "Energia elétrica", categoria: "Moradia", valor: 210.9, vence: "20/07", tipo: "conta" },
  { descricao: "Netflix", categoria: "Assinatura", valor: 44.9, vence: "22/07", tipo: "assinatura" },
  { descricao: "Academia", categoria: "Saúde", valor: 129.9, vence: "25/07", tipo: "assinatura" },
];
