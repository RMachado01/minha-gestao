import type { PontoSerie } from "./types";
import type { DonutSlice } from "@/components/charts/CompositionDonut";

/** Investimentos: evolução patrimonial, alocação e posições. */

/** Evolução: valor investido (aportado) x valor atual de mercado. */
export const evolucaoPatrimonial: PontoSerie[] = [
  { periodo: "Ago", investido: 42000, atual: 43100 },
  { periodo: "Set", investido: 44500, atual: 45900 },
  { periodo: "Out", investido: 46000, atual: 48200 },
  { periodo: "Nov", investido: 48500, atual: 50100 },
  { periodo: "Dez", investido: 50000, atual: 52800 },
  { periodo: "Jan", investido: 52500, atual: 54200 },
  { periodo: "Fev", investido: 54000, atual: 53100 },
  { periodo: "Mar", investido: 56500, atual: 58900 },
  { periodo: "Abr", investido: 58000, atual: 61200 },
  { periodo: "Mai", investido: 60500, atual: 63400 },
  { periodo: "Jun", investido: 62000, atual: 64100 },
  { periodo: "Jul", investido: 64500, atual: 69800 },
];

export const alocacao: DonutSlice[] = [
  { name: "Renda fixa", value: 31000 },
  { name: "Renda variável", value: 18500 },
  { name: "Fundos", value: 11800 },
  { name: "Cripto", value: 5200 },
  { name: "Outros", value: 3300 },
];

export interface Posicao {
  nome: string;
  tipo: string;
  investido: number;
  atual: number;
  instituicao: string;
}

export const posicoes: Posicao[] = [
  { nome: "Tesouro Selic 2029", tipo: "Renda fixa", investido: 18000, atual: 19240, instituicao: "Tesouro Direto" },
  { nome: "CDB 108% CDI", tipo: "Renda fixa", investido: 13000, atual: 13760, instituicao: "Banco Inter" },
  { nome: "ETF IVVB11", tipo: "Renda variável", investido: 10500, atual: 12180, instituicao: "XP" },
  { nome: "Ações PETR4", tipo: "Renda variável", investido: 8000, atual: 6320, instituicao: "XP" },
  { nome: "Fundo Multimercado", tipo: "Fundos", investido: 11800, atual: 12440, instituicao: "BTG" },
  { nome: "Bitcoin", tipo: "Cripto", investido: 5200, atual: 5860, instituicao: "Binance" },
];

const investidoTotal = 64500;
const atualTotal = 69800;

export const investimentosKpis = {
  patrimonio: atualTotal,
  investido: investidoTotal,
  rentabilidade: (atualTotal - investidoTotal) / investidoTotal, // ~0.082
  ganho: atualTotal - investidoTotal,
  trendMes: 0.089,
};
