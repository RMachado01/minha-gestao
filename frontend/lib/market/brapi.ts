/**
 * Cliente do lado do servidor para a brapi.dev (cotações B3). O token nunca
 * é exposto ao navegador — só é lido aqui, dentro de Route Handlers.
 * Ver DEPLOYMENT.md para como configurar BRAPI_TOKEN.
 */

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

interface BrapiCashDividend {
  rate?: number;
  paymentDate?: string;
  lastDividendDate?: string;
}

interface BrapiQuoteResult {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  dividendYield?: number;
  dividendsData?: { cashDividends?: BrapiCashDividend[] };
}

interface BrapiResponse {
  results?: BrapiQuoteResult[];
}

function sumRecentDividends(entries: BrapiCashDividend[] | undefined): number | null {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const total = entries.reduce((sum, entry) => {
    const dateStr = entry.paymentDate ?? entry.lastDividendDate;
    const rate = Number(entry.rate);
    if (!dateStr || !Number.isFinite(rate)) return sum;
    const time = new Date(dateStr).getTime();
    if (Number.isNaN(time) || time < cutoff) return sum;
    return sum + rate;
  }, 0);
  return total > 0 ? total : null;
}

function toQuote(result: BrapiQuoteResult): MarketQuote | null {
  const price = Number(result.regularMarketPrice);
  if (!result.symbol || !Number.isFinite(price)) return null;
  const dividends12m = sumRecentDividends(result.dividendsData?.cashDividends);
  // Sempre calculado como fração (dividendos ÷ preço) para não misturar unidades
  // com o campo dividendYield da API, cuja escala (fração vs. percentual) não é garantida.
  const dividendYieldApprox = dividends12m && price > 0 ? dividends12m / price : null;
  return {
    ticker: result.symbol,
    name: result.longName ?? result.shortName ?? result.symbol,
    price,
    changePercent: Number(result.regularMarketChangePercent) || 0,
    dayHigh: Number.isFinite(result.regularMarketDayHigh) ? Number(result.regularMarketDayHigh) : null,
    dayLow: Number.isFinite(result.regularMarketDayLow) ? Number(result.regularMarketDayLow) : null,
    volume: Number.isFinite(result.regularMarketVolume) ? Number(result.regularMarketVolume) : null,
    marketCap: Number.isFinite(result.marketCap) ? Number(result.marketCap) : null,
    dividends12m,
    dividendYieldApprox: dividendYieldApprox ?? null,
  };
}

/**
 * Busca cotações em lote na brapi.dev. Lança erro descritivo (nunca o token)
 * quando BRAPI_TOKEN não está configurado ou a chamada falha — quem chama
 * decide como exibir isso ao usuário.
 */
export async function fetchMarketQuotes(tickers: string[], revalidateSeconds: number): Promise<MarketQuote[]> {
  const token = process.env.BRAPI_TOKEN;
  if (!token) throw new Error("BRAPI_TOKEN não configurado.");
  if (tickers.length === 0) return [];

  const url = `https://brapi.dev/api/quote/${encodeURIComponent(tickers.join(","))}?dividends=true&token=${token}`;
  const response = await fetch(url, { next: { revalidate: revalidateSeconds } });
  if (!response.ok) throw new Error(`brapi.dev retornou status ${response.status}.`);

  const data = (await response.json()) as BrapiResponse;
  return (data.results ?? []).map(toQuote).filter((quote): quote is MarketQuote => quote !== null);
}
