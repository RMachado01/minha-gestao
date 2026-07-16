/**
 * Radar de dividendos: lista curada de ativos líquidos da B3 com histórico
 * consistente de distribuição de proventos. Não é recomendação de investimento
 * — apenas o universo consultado para montar o ranking de yield aproximado.
 */
export const DIVIDEND_WATCHLIST: Array<{ ticker: string; label: string }> = [
  { ticker: "PETR4", label: "Petrobras PN" },
  { ticker: "VALE3", label: "Vale ON" },
  { ticker: "ITSA4", label: "Itaúsa PN" },
  { ticker: "BBAS3", label: "Banco do Brasil ON" },
  { ticker: "BBSE3", label: "BB Seguridade ON" },
  { ticker: "TAEE11", label: "Taesa Units" },
  { ticker: "CMIG4", label: "Cemig PN" },
  { ticker: "TRPL4", label: "Isa CTEEP PN" },
  { ticker: "CXSE3", label: "Caixa Seguridade ON" },
  { ticker: "EGIE3", label: "Engie Brasil ON" },
  { ticker: "CPFE3", label: "CPFL Energia ON" },
  { ticker: "KLBN11", label: "Klabin Units" },
  { ticker: "SAPR11", label: "Sanepar Units" },
  { ticker: "B3SA3", label: "B3 ON" },
  { ticker: "ITUB4", label: "Itaú Unibanco PN" },
];

export const DIVIDEND_WATCHLIST_TICKERS = DIVIDEND_WATCHLIST.map((item) => item.ticker);
