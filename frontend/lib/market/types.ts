/** Cotação de um ativo, no formato gravado em market_quote_cache pelo job Python. */
export interface MarketQuote {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  marketCap: number | null;
  /** Soma de dividendos pagos nos últimos 12 meses, quando disponível. */
  dividends12m: number | null;
  /** Yield aproximado (dividendos 12m / preço atual) — estimativa, não garantia. */
  dividendYieldApprox: number | null;
}
