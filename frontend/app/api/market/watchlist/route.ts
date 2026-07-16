import { NextResponse } from "next/server";
import { fetchMarketQuotes } from "@/lib/market/brapi";
import { DIVIDEND_WATCHLIST, DIVIDEND_WATCHLIST_TICKERS } from "@/lib/market/watchlist";

// Lista fixa e igual para todo mundo — cache generoso preserva a cota gratuita da brapi.
export const revalidate = 1800;

export async function GET() {
  try {
    const quotes = await fetchMarketQuotes(DIVIDEND_WATCHLIST_TICKERS, revalidate);
    const labelByTicker = new Map(DIVIDEND_WATCHLIST.map((item) => [item.ticker, item.label]));
    const ranked = quotes
      .map((quote) => ({ ...quote, name: labelByTicker.get(quote.ticker) ?? quote.name }))
      .sort((a, b) => (b.dividendYieldApprox ?? -1) - (a.dividendYieldApprox ?? -1));
    return NextResponse.json({ quotes: ranked });
  } catch (error) {
    return NextResponse.json({ quotes: [], error: error instanceof Error ? error.message : "Falha ao buscar dados de mercado." }, { status: 502 });
  }
}
