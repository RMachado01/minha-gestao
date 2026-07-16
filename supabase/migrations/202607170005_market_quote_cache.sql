-- Cache compartilhado de cotações (não pertence a nenhum usuário — preço de
-- ação é dado público). Guarda o último valor obtido com sucesso da brapi.dev
-- para cada ticker, para servir como fallback quando o plano gratuito recusa
-- uma nova requisição (limite de ativos/requisições simultâneas). Sem isso,
-- só os primeiros tickers que "ganham a corrida" a cada carregamento
-- apareciam — os demais nunca tinham chance de mostrar nada.

create table public.market_quote_cache (
  ticker text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.market_quote_cache enable row level security;

create policy "market_quote_cache_shared" on public.market_quote_cache
  for all to authenticated, anon
  using (true)
  with check (true);

grant select, insert, update on public.market_quote_cache to authenticated, anon;
