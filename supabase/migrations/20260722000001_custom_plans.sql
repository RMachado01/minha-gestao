-- Planos personalizados: orçamentos por categoria (tetos de gasto) e alertas
-- configuráveis pelo usuário. O gasto realizado é sempre derivado das
-- transações — estas tabelas guardam apenas os limites/regras definidos.

create table if not exists public.category_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  category text not null,
  limit_amount numeric(12,2) not null check (limit_amount > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

create table if not exists public.spending_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  -- null = todas as categorias (gasto total do mês)
  category text,
  threshold_amount numeric(12,2) not null check (threshold_amount > 0),
  period text not null default 'monthly' check (period in ('monthly')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.category_budgets enable row level security;
alter table public.spending_alerts enable row level security;

-- Ownership policies no mesmo formato do hardening de RLS: restritas a
-- requisições autenticadas e com auth.uid() avaliado uma vez por statement.
drop policy if exists "category_budgets_owner" on public.category_budgets;
create policy "category_budgets_owner" on public.category_budgets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "spending_alerts_owner" on public.spending_alerts;
create policy "spending_alerts_owner" on public.spending_alerts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index if not exists category_budgets_user_idx
  on public.category_budgets (user_id);

create index if not exists spending_alerts_user_active_idx
  on public.spending_alerts (user_id, active);
