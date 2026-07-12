import type { Modo, PontoSerie } from "./types";

/** Módulo Uber: receita bruta, custo combustível e lucro líquido. */

/** Modo mensal: últimos ~14 dias. */
export const uberDiario: PontoSerie[] = [
  { periodo: "28/06", receita: 312, combustivel: 78, lucro: 234 },
  { periodo: "29/06", receita: 289, combustivel: 72, lucro: 217 },
  { periodo: "30/06", receita: 356, combustivel: 94, lucro: 262 },
  { periodo: "01/07", receita: 298, combustivel: 81, lucro: 217 },
  { periodo: "02/07", receita: 340, combustivel: 88, lucro: 252 },
  { periodo: "03/07", receita: 410, combustivel: 112, lucro: 298 },
  { periodo: "04/07", receita: 388, combustivel: 105, lucro: 283 },
  { periodo: "05/07", receita: 275, combustivel: 76, lucro: 199 },
  { periodo: "06/07", receita: 322, combustivel: 90, lucro: 232 },
  { periodo: "07/07", receita: 368, combustivel: 99, lucro: 269 },
  { periodo: "08/07", receita: 344, combustivel: 96, lucro: 248 },
  { periodo: "09/07", receita: 401, combustivel: 118, lucro: 283 },
  { periodo: "10/07", receita: 379, combustivel: 108, lucro: 271 },
  { periodo: "11/07", receita: 356, combustivel: 102, lucro: 254 },
];

/** Modo anual: por mês. */
export const uberMensal: PontoSerie[] = [
  { periodo: "Jan", receita: 8200, combustivel: 2100, lucro: 6100 },
  { periodo: "Fev", receita: 7600, combustivel: 1980, lucro: 5620 },
  { periodo: "Mar", receita: 9100, combustivel: 2380, lucro: 6720 },
  { periodo: "Abr", receita: 8700, combustivel: 2290, lucro: 6410 },
  { periodo: "Mai", receita: 9400, combustivel: 2560, lucro: 6840 },
  { periodo: "Jun", receita: 9800, combustivel: 2740, lucro: 7060 },
  { periodo: "Jul", receita: 10200, combustivel: 3010, lucro: 7190 },
];

export function getUber(modo: Modo): PontoSerie[] {
  return modo === "anual" ? uberMensal : uberDiario;
}

/**
 * KPIs: média móvel do período atual vs. anterior.
 * Destaque separado para tendência do custo de combustível (alerta se subir).
 */
export const uberKpis = {
  receitaPeriodo: 4838,
  combustivelPeriodo: 1349,
  lucroLiquido: 3489,
  margemLiquida: 0.721, // lucro / receita
  custoCombustivelPct: 0.279, // combustivel / receita
  trendLucro: 0.084, // média atual vs anterior (bom)
  trendMargem: -0.021, // margem caindo levemente (atenção)
  trendCombustivel: 0.156, // custo subindo (alerta) — usar invert no badge
  kmRodados: 1420,
  custoPorKm: 0.95,
};
