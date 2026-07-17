#!/usr/bin/env python3
"""
Alimenta a tabela `market_quote_cache` no Supabase com cotações da brapi.dev.

Roda de fora do app (GitHub Actions, agendado) para não depender do
carregamento de página do usuário — o plano gratuito da brapi só aceita 1
ativo por requisição e limita requisições simultâneas, então aqui buscamos
UM ticker por vez, espaçado, e gravamos cada resultado no banco. O frontend
apenas lê essa tabela, então mostra as 15 ações instantaneamente e sem bater
no limite da API.

Variáveis de ambiente necessárias (GitHub Actions secrets):
  BRAPI_TOKEN                  token da brapi.dev
  SUPABASE_URL                 https://<ref>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY    service_role key (Settings > API) — ignora RLS

Uso local:  python scripts/refresh_market_quotes.py
"""

import json
import os
import sys
import time
from datetime import datetime, timezone, timedelta

import requests

# Mantenha em sincronia com frontend/lib/market/watchlist.ts
DIVIDEND_WATCHLIST = [
    "PETR4", "VALE3", "ITSA4", "BBAS3", "BBSE3", "TAEE11", "CMIG4", "TRPL4",
    "CXSE3", "EGIE3", "CPFE3", "KLBN11", "SAPR11", "B3SA3", "ITUB4",
]

BRAPI_TOKEN = os.environ.get("BRAPI_TOKEN", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

REQUEST_DELAY_SECONDS = 1.5   # espaçamento entre chamadas à brapi
STALE_DAYS = 30               # remove do cache tickers não vistos há N dias


def fail(msg: str) -> None:
    print(f"ERRO: {msg}", file=sys.stderr)
    sys.exit(1)


def sum_recent_dividends(cash_dividends) -> float | None:
    """Soma dos proventos pagos nos últimos 12 meses (mesma regra do frontend)."""
    if not isinstance(cash_dividends, list) or not cash_dividends:
        return None
    cutoff = datetime.now(timezone.utc) - timedelta(days=365)
    total = 0.0
    for entry in cash_dividends:
        rate = entry.get("rate")
        date_str = entry.get("paymentDate") or entry.get("lastDividendDate")
        if rate is None or not date_str:
            continue
        try:
            paid = datetime.fromisoformat(str(date_str).replace("Z", "+00:00"))
            if paid.tzinfo is None:
                paid = paid.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
        if paid >= cutoff:
            try:
                total += float(rate)
            except (TypeError, ValueError):
                continue
    return total if total > 0 else None


def to_quote(result: dict) -> dict | None:
    """Converte o resultado bruto da brapi no formato MarketQuote do frontend."""
    symbol = result.get("symbol")
    price = result.get("regularMarketPrice")
    if not symbol or not isinstance(price, (int, float)):
        return None
    dividends_data = result.get("dividendsData") or {}
    dividends_12m = sum_recent_dividends(dividends_data.get("cashDividends"))
    yield_approx = (dividends_12m / price) if (dividends_12m and price > 0) else None

    def num_or_none(v):
        return v if isinstance(v, (int, float)) else None

    return {
        "ticker": symbol,
        "name": result.get("longName") or result.get("shortName") or symbol,
        "price": price,
        "changePercent": result.get("regularMarketChangePercent") or 0,
        "dayHigh": num_or_none(result.get("regularMarketDayHigh")),
        "dayLow": num_or_none(result.get("regularMarketDayLow")),
        "volume": num_or_none(result.get("regularMarketVolume")),
        "marketCap": num_or_none(result.get("marketCap")),
        "dividends12m": dividends_12m,
        "dividendYieldApprox": yield_approx,
    }


def fetch_quote(ticker: str) -> dict | None:
    url = f"https://brapi.dev/api/quote/{ticker}"
    try:
        resp = requests.get(
            url, params={"dividends": "true", "token": BRAPI_TOKEN}, timeout=20
        )
    except requests.RequestException as exc:
        print(f"  {ticker}: falha de rede ({exc})")
        return None
    if resp.status_code != 200:
        print(f"  {ticker}: brapi status {resp.status_code} — {resp.text[:160]}")
        return None
    results = (resp.json() or {}).get("results") or []
    if not results:
        print(f"  {ticker}: sem resultados")
        return None
    return to_quote(results[0])


def supabase_headers() -> dict:
    return {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
    }


def portfolio_tickers() -> list[str]:
    """Tickers das posições cadastradas pelos usuários (renda variável/cripto)."""
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/investments",
            params={"select": "ticker", "archived": "eq.false", "ticker": "not.is.null"},
            headers=supabase_headers(),
            timeout=20,
        )
        if resp.status_code != 200:
            print(f"aviso: não foi possível ler investments ({resp.status_code})")
            return []
        return [row["ticker"].strip().upper() for row in resp.json() if row.get("ticker")]
    except requests.RequestException as exc:
        print(f"aviso: erro ao ler investments ({exc})")
        return []


def upsert_quotes(rows: list[dict]) -> None:
    if not rows:
        return
    now = datetime.now(timezone.utc).isoformat()
    payload = [{"ticker": q["ticker"], "data": q, "updated_at": now} for q in rows]
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/market_quote_cache",
        params={"on_conflict": "ticker"},
        headers={**supabase_headers(), "Prefer": "resolution=merge-duplicates,return=minimal"},
        data=json.dumps(payload),
        timeout=30,
    )
    if resp.status_code not in (200, 201, 204):
        fail(f"upsert falhou ({resp.status_code}): {resp.text[:300]}")
    print(f"gravados/atualizados {len(payload)} tickers no cache")


def cleanup_stale(active_tickers: list[str]) -> None:
    """Remove do cache tickers que não são mais rastreados e estão velhos."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=STALE_DAYS)).isoformat()
    quoted = ",".join(f'"{t}"' for t in active_tickers)
    try:
        resp = requests.delete(
            f"{SUPABASE_URL}/rest/v1/market_quote_cache",
            params={"updated_at": f"lt.{cutoff}", "ticker": f"not.in.({quoted})"},
            headers=supabase_headers(),
            timeout=20,
        )
        if resp.status_code in (200, 204):
            print("limpeza de registros antigos concluída")
    except requests.RequestException as exc:
        print(f"aviso: limpeza falhou ({exc})")


def main() -> None:
    if not BRAPI_TOKEN:
        fail("BRAPI_TOKEN não definido.")
    if not SUPABASE_URL or not SERVICE_KEY:
        fail("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não definidos.")

    tickers = list(dict.fromkeys(DIVIDEND_WATCHLIST + portfolio_tickers()))
    print(f"atualizando {len(tickers)} tickers: {', '.join(tickers)}")

    collected: list[dict] = []
    for i, ticker in enumerate(tickers):
        quote = fetch_quote(ticker)
        if quote:
            collected.append(quote)
            print(f"  {ticker}: R$ {quote['price']} ({quote['changePercent']:+.2f}%)")
        if i < len(tickers) - 1:
            time.sleep(REQUEST_DELAY_SECONDS)

    upsert_quotes(collected)
    cleanup_stale(tickers)
    print(f"concluído: {len(collected)}/{len(tickers)} tickers atualizados.")


if __name__ == "__main__":
    main()
