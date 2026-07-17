"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MarketQuote } from "./types";
import { DIVIDEND_WATCHLIST_TICKERS } from "./watchlist";

export interface QuoteState {
  quotes: MarketQuote[];
  loading: boolean;
  error: string;
  /** Momento da atualização mais recente entre os tickers carregados (ISO). */
  updatedAt: string | null;
}

interface CacheRow {
  ticker: string;
  data: MarketQuote;
  updated_at: string;
}

const EMPTY: QuoteState = { quotes: [], loading: true, error: "", updatedAt: null };

/**
 * Lê as cotações direto da tabela market_quote_cache (alimentada por um job
 * externo, ver scripts/refresh_market_quotes.py). O app não chama a brapi no
 * carregamento — só lê o banco, então mostra todos os tickers de uma vez, sem
 * depender do limite de requisições da API.
 */
function useCachedQuotes(tickers: string[], rankByYield: boolean): QuoteState {
  const key = tickers.join(",");
  const [state, setState] = useState<QuoteState>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(async () => {
      if (!key) {
        if (!cancelled) setState({ quotes: [], loading: false, error: "", updatedAt: null });
        return;
      }
      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) setState({ quotes: [], loading: false, error: "Supabase não configurado.", updatedAt: null });
        return;
      }

      const { data, error } = await supabase
        .from("market_quote_cache")
        .select("ticker,data,updated_at")
        .in("ticker", tickers);

      if (cancelled) return;
      if (error) {
        setState({ quotes: [], loading: false, error: "Não foi possível carregar as cotações.", updatedAt: null });
        return;
      }

      const rows = (data ?? []) as CacheRow[];
      const quotes = rows.map((row) => row.data);
      const sorted = rankByYield
        ? [...quotes].sort((a, b) => (b.dividendYieldApprox ?? -1) - (a.dividendYieldApprox ?? -1))
        : quotes;
      const updatedAt = rows.reduce<string | null>((latest, row) => (!latest || row.updated_at > latest ? row.updated_at : latest), null);

      setState({
        quotes: sorted,
        loading: false,
        error: quotes.length === 0 ? "Cotações ainda não disponíveis. O radar é atualizado automaticamente ao longo do dia." : "",
        updatedAt,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [key, rankByYield]);

  return state;
}

/** Ranking de dividendos da watchlist curada — lê do cache compartilhado. */
export function useDividendWatchlist(): QuoteState {
  return useCachedQuotes(DIVIDEND_WATCHLIST_TICKERS, true);
}

/** Cotação das posições da carteira com ticker cadastrado — lê do cache compartilhado. */
export function usePortfolioQuotes(tickers: string[]): QuoteState {
  return useCachedQuotes(tickers, false);
}
