import type { DonutSlice } from "@/components/charts/CompositionDonut";

/** Composição de gastos por categoria (mês corrente). */

export interface GastoCategoria extends DonutSlice {
  name: string;
  value: number;
  color?: string;
  /** Variação vs. mês anterior (fração). */
  trend: number;
  transacoes: number;
}

export const gastosPorCategoria: GastoCategoria[] = [
  { name: "Moradia", value: 1860.9, trend: 0.02, transacoes: 4 },
  { name: "Alimentação", value: 1240.5, trend: 0.14, transacoes: 38 },
  { name: "Transporte", value: 680.0, trend: -0.08, transacoes: 22 },
  { name: "Cartão de crédito", value: 620.3, trend: 0.05, transacoes: 12 },
  { name: "Lazer", value: 410.8, trend: 0.31, transacoes: 9 },
  { name: "Saúde", value: 289.8, trend: -0.02, transacoes: 3 },
  { name: "Assinaturas", value: 219.7, trend: 0.0, transacoes: 6 },
];

export const gastosTotal = gastosPorCategoria.reduce((s, g) => s + g.value, 0);

/** Evolução do total de gastos nos últimos 6 meses. */
export const gastosHistorico = [
  { periodo: "Fev", gastos: 6100 },
  { periodo: "Mar", gastos: 5900 },
  { periodo: "Abr", gastos: 6800 },
  { periodo: "Mai", gastos: 5600 },
  { periodo: "Jun", gastos: 7200 },
  { periodo: "Jul", gastos: 5300 },
];
