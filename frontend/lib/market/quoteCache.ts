import { createClient } from "@supabase/supabase-js";
import type { MarketQuote } from "./brapi";

/**
 * Cache compartilhado (tabela market_quote_cache) do último valor obtido com
 * sucesso por ticker — dado público, não pertence a nenhum usuário, por isso
 * usa a chave publishable direto (sem sessão) em vez do cliente de página.
 */
function getCacheClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function readCachedQuotes(tickers: string[]): Promise<Map<string, MarketQuote>> {
  const supabase = getCacheClient();
  const map = new Map<string, MarketQuote>();
  if (!supabase || tickers.length === 0) return map;

  const { data } = await supabase.from("market_quote_cache").select("ticker,data").in("ticker", tickers);
  for (const row of data ?? []) {
    map.set(row.ticker as string, row.data as MarketQuote);
  }
  return map;
}

export async function writeCachedQuote(quote: MarketQuote): Promise<void> {
  const supabase = getCacheClient();
  if (!supabase) return;
  await supabase.from("market_quote_cache").upsert({ ticker: quote.ticker, data: quote, updated_at: new Date().toISOString() });
}
