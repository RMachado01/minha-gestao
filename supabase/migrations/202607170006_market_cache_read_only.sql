-- A alimentação do cache de cotações passou a ser feita por um job externo
-- (GitHub Actions + Python, 1 requisição por vez) usando a service_role key,
-- que ignora RLS. Portanto o app (anon/authenticated) só precisa LER a tabela
-- — remove a permissão de escrita que a migration anterior havia concedido ao
-- anon (qualquer visitante podia sobrescrever o cache).

drop policy if exists "market_quote_cache_shared" on public.market_quote_cache;

create policy "market_quote_cache_read" on public.market_quote_cache
  for select to authenticated, anon
  using (true);

revoke insert, update, delete on public.market_quote_cache from authenticated, anon;
grant select on public.market_quote_cache to authenticated, anon;

-- Índice para varreduras por data (usado na limpeza de registros antigos).
create index if not exists market_quote_cache_updated_idx on public.market_quote_cache(updated_at);
