import type { PontoSerie } from "./types";

/** Cartões de crédito (mínimo 3). */

export interface Cartao {
  id: string;
  apelido: string;
  bandeira: string;
  banco: string;
  limiteTotal: number;
  limiteUsado: number;
  faturaAtual: number;
  vencimento: string; // dd/mm
  status: "aberta" | "fechada" | "paga";
  cor: string;
}

export const cartoes: Cartao[] = [
  {
    id: "nubank",
    apelido: "Nubank",
    bandeira: "Mastercard",
    banco: "Nubank",
    limiteTotal: 6000,
    limiteUsado: 1840.32,
    faturaAtual: 1840.32,
    vencimento: "15/07",
    status: "aberta",
    cor: "#c084fc",
  },
  {
    id: "itau",
    apelido: "Itaú Click",
    bandeira: "Visa",
    banco: "Itaú",
    limiteTotal: 4500,
    limiteUsado: 920.5,
    faturaAtual: 920.5,
    vencimento: "18/07",
    status: "aberta",
    cor: "#818cf8",
  },
  {
    id: "inter",
    apelido: "Inter Gold",
    bandeira: "Mastercard",
    banco: "Inter",
    limiteTotal: 3000,
    limiteUsado: 2380.7,
    faturaAtual: 2380.7,
    vencimento: "22/07",
    status: "fechada",
    cor: "#22d3ee",
  },
];

/** Total das faturas em aberto mês a mês (consolidado dos cartões). */
export const faturasHistorico: PontoSerie[] = [
  { periodo: "Fev", total: 4200 },
  { periodo: "Mar", total: 3900 },
  { periodo: "Abr", total: 5100 },
  { periodo: "Mai", total: 4600 },
  { periodo: "Jun", total: 5800 },
  { periodo: "Jul", total: 5141.52 },
];

export const cartoesKpis = {
  limiteTotal: cartoes.reduce((s, c) => s + c.limiteTotal, 0),
  limiteUsado: cartoes.reduce((s, c) => s + c.limiteUsado, 0),
  faturasEmAberto: cartoes.reduce((s, c) => s + c.faturaAtual, 0),
  proximoVencimento: "15/07",
};
