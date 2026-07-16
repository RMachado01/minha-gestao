"use client";

import { useEffect, useState } from "react";
import type { MarketQuote } from "./brapi";

interface MarketState {
  quotes: MarketQuote[];
  loading: boolean;
  error: string;
}

const EMPTY: MarketState = { quotes: [], loading: true, error: "" };

async function loadQuotes(url: string): Promise<MarketState> {
  try {
    const response = await fetch(url);
    const data = (await response.json()) as { quotes?: MarketQuote[]; error?: string };
    if (!response.ok) return { quotes: [], loading: false, error: data.error ?? "Não foi possível carregar dados de mercado." };
    return { quotes: data.quotes ?? [], loading: false, error: "" };
  } catch {
    return { quotes: [], loading: false, error: "Não foi possível carregar dados de mercado." };
  }
}

/** Ranking de dividendos da watchlist curada — mesmo conteúdo para todo mundo, cacheado no servidor. */
export function useDividendWatchlist(): MarketState {
  const [state, setState] = useState(EMPTY);

  useEffect(() => {
    void Promise.resolve()
      .then(() => loadQuotes("/api/market/watchlist"))
      .then(setState);
  }, []);

  return state;
}

/** Cotação ao vivo dos tickers informados (posições da carteira com ticker cadastrado). */
export function usePortfolioQuotes(tickers: string[]): MarketState {
  const key = tickers.join(",");
  const [state, setState] = useState(EMPTY);

  useEffect(() => {
    if (!key) {
      void Promise.resolve().then(() => setState({ quotes: [], loading: false, error: "" }));
      return;
    }
    void Promise.resolve()
      .then(() => loadQuotes(`/api/market/quote?tickers=${encodeURIComponent(key)}`))
      .then(setState);
  }, [key]);

  return state;
}
