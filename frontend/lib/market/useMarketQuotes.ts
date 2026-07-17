"use client";

import { useEffect, useRef, useState } from "react";
import type { MarketQuote } from "./brapi";
import { DIVIDEND_WATCHLIST_TICKERS } from "./watchlist";

// Plano gratuito da brapi.dev só aceita 1 ativo por requisição e limita
// requisições simultâneas — buscar UM ticker por vez, espaçado, dá a cada
// ativo uma chance justa (em vez de a corrida deixar sempre os mesmos poucos
// passarem). O que carrega com sucesso é gravado no cache compartilhado do
// servidor, então ao longo do uso todos os tickers acabam aparecendo.
const BATCH_SIZE = 1;
const BATCH_DELAY_MS = 350;

export interface QuoteState {
  quotes: MarketQuote[];
  /** Tickers ainda não resolvidos — usado para renderizar linhas de esqueleto. */
  pending: string[];
  loading: boolean;
  error: string;
}

function emptyState(tickers: string[]): QuoteState {
  return { quotes: [], pending: tickers, loading: tickers.length > 0, error: "" };
}

async function fetchOneTicker(ticker: string): Promise<{ ticker: string; quote: MarketQuote | null; error: string | null }> {
  try {
    const response = await fetch(`/api/market/quote?tickers=${encodeURIComponent(ticker)}`);
    const data = (await response.json()) as { quotes?: MarketQuote[]; error?: string };
    return { ticker, quote: data.quotes?.[0] ?? null, error: data.quotes?.[0] ? null : (data.error ?? null) };
  } catch {
    return { ticker, quote: null, error: `Falha de rede ao consultar ${ticker}.` };
  }
}

function sortByYield(quotes: MarketQuote[]): MarketQuote[] {
  return [...quotes].sort((a, b) => (b.dividendYieldApprox ?? -1) - (a.dividendYieldApprox ?? -1));
}

/**
 * Busca uma lista de tickers de forma progressiva (poucos por vez) — os
 * resultados vão sendo entregues aos poucos via setState em vez de esperar
 * o lote inteiro terminar, para a UI poder animar cada linha ao chegar.
 */
function useProgressiveQuotes(tickers: string[], rankByYield: boolean): QuoteState {
  const key = tickers.join(",");
  const [state, setState] = useState<QuoteState>(() => emptyState(tickers));
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    void Promise.resolve().then(async () => {
      if (cancelledRef.current) return;
      if (tickers.length === 0) {
        setState({ quotes: [], pending: [], loading: false, error: "" });
        return;
      }

      setState(emptyState(tickers));
      let anySuccess = false;
      let lastError = "";

      for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
        if (cancelledRef.current) return;
        const batch = tickers.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(fetchOneTicker));
        if (cancelledRef.current) return;

        for (const r of results) {
          if (r.quote) anySuccess = true;
          else if (r.error) lastError = r.error;
        }

        const resolvedTickers = new Set(results.map((r) => r.ticker));
        const newQuotes = results.map((r) => r.quote).filter((q): q is MarketQuote => q !== null);
        setState((prev) => ({
          quotes: rankByYield ? sortByYield([...prev.quotes, ...newQuotes]) : [...prev.quotes, ...newQuotes],
          pending: prev.pending.filter((t) => !resolvedTickers.has(t)),
          loading: true,
          error: "",
        }));

        if (i + BATCH_SIZE < tickers.length) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }

      if (!cancelledRef.current) {
        setState((prev) => ({ ...prev, loading: false, error: anySuccess ? "" : lastError }));
      }
    });

    return () => {
      cancelledRef.current = true;
    };
  }, [key, rankByYield]);

  return state;
}

/** Ranking de dividendos da watchlist curada — mesmo conteúdo para todo mundo, cacheado no servidor. */
export function useDividendWatchlist(): QuoteState {
  return useProgressiveQuotes(DIVIDEND_WATCHLIST_TICKERS, true);
}

/** Cotação ao vivo dos tickers informados (posições da carteira com ticker cadastrado). */
export function usePortfolioQuotes(tickers: string[]): QuoteState {
  return useProgressiveQuotes(tickers, false);
}
