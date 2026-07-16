import { NextResponse, type NextRequest } from "next/server";
import { fetchMarketQuotes } from "@/lib/market/brapi";

// Tickers variam por usuário (posições da carteira) — cache menor que o watchlist fixo.
export const revalidate = 900;

const MAX_TICKERS = 20;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("tickers") ?? "";
  const tickers = Array.from(
    new Set(
      raw
        .split(",")
        .map((ticker) => ticker.trim().toUpperCase())
        .filter(Boolean),
    ),
  ).slice(0, MAX_TICKERS);

  if (tickers.length === 0) return NextResponse.json({ quotes: [] });

  try {
    const quotes = await fetchMarketQuotes(tickers, revalidate);
    return NextResponse.json({ quotes });
  } catch (error) {
    return NextResponse.json({ quotes: [], error: error instanceof Error ? error.message : "Falha ao buscar dados de mercado." }, { status: 502 });
  }
}
