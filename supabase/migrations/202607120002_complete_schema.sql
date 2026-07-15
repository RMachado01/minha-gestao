-- Migration 2: Complete schema — missing tables, columns, views
-- Depends on: 202607120001_initial_schema.sql

-- ============================================================
-- 1. New tables
-- ============================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  type text not null check (type in ('income','expense')),
  color text,
  icon text,
  created_at timestamptz not null default now()
);

create table public.recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  description text not null,
  type text not null check (type in ('subscription','installment','fixed_bill')),
  amount numeric(12,2) not null check (amount > 0),
  day_of_month smallint not null check (day_of_month between 1 and 31),
  start_date date not null,
  end_date date,
  total_installments int,
  current_installment int,
  active boolean not null default true,
  category_id uuid references public.categories(id),
  created_at timestamptz not null default now()
);

create table public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  type text not null check (type in ('renda_fixa','renda_variavel','fundo','cripto','outro')),
  invested_amount numeric(12,2) not null check (invested_amount >= 0),
  application_date date not null,
  institution text not null,
  created_at timestamptz not null default now()
);

create table public.investment_snapshots (
  id uuid primary key default gen_random_uuid(),
  investment_id uuid not null references public.investments(id) on delete cascade,
  snapshot_date date not null,
  current_value numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table public.credit_card_bills (
  id uuid primary key default gen_random_uuid(),
  credit_card_id uuid not null references public.credit_cards(id) on delete cascade,
  reference_month char(7) not null,
  total_amount numeric(12,2) not null default 0,
  status text not null default 'open' check (status in ('open','closed','paid')),
  created_at timestamptz not null default now(),
  unique (credit_card_id, reference_month)
);

-- ============================================================
-- 2. Add missing columns to transactions
-- ============================================================

alter table public.transactions
  add column category_id uuid references public.categories(id),
  add column origin text check (origin in ('fixed_income','variable_income','expense','recurring_expense')),
  add column status text not null default 'pending' check (status in ('pending','paid','received')),
  add column recurrence_id uuid references public.recurrence_rules(id),
  add column installments_total smallint,
  add column current_installment smallint,
  add column bill_reference char(7);

-- ============================================================
-- 3. RLS on new tables
-- ============================================================

alter table public.categories enable row level security;
alter table public.recurrence_rules enable row level security;
alter table public.investments enable row level security;
alter table public.investment_snapshots enable row level security;
alter table public.credit_card_bills enable row level security;

create policy "categories_owner" on public.categories for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "recurrence_owner" on public.recurrence_rules for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "investments_owner" on public.investments for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "snapshots_via_investment" on public.investment_snapshots for all
  using (exists(select 1 from public.investments i where i.id = investment_id and i.user_id = auth.uid()))
  with check (exists(select 1 from public.investments i where i.id = investment_id and i.user_id = auth.uid()));

create policy "bills_via_card" on public.credit_card_bills for all
  using (exists(select 1 from public.credit_cards c where c.id = credit_card_id and c.user_id = auth.uid()))
  with check (exists(select 1 from public.credit_cards c where c.id = credit_card_id and c.user_id = auth.uid()));

-- ============================================================
-- 4. Indexes
-- ============================================================

create index categories_user_idx on public.categories(user_id);
create index recurrence_user_active_idx on public.recurrence_rules(user_id, active);
create index investments_user_idx on public.investments(user_id);
create index snapshots_inv_date_idx on public.investment_snapshots(investment_id, snapshot_date desc);
create index bills_card_month_idx on public.credit_card_bills(credit_card_id, reference_month desc);

-- ============================================================
-- 5. Aggregation views (CLAUDE.md §6.4)
-- ============================================================

create or replace view public.vw_resumo_mensal
with (security_invoker = true) as
select user_id,
       date_trunc('month', occurred_on)::date as month,
       sum(case when type = 'income' then amount else 0 end) as total_income,
       sum(case when type in ('expense','benefit') then amount else 0 end) as total_expenses,
       sum(case when type = 'income' then amount else 0 end)
         - sum(case when type in ('expense','benefit') then amount else 0 end) as balance
from public.transactions
group by user_id, date_trunc('month', occurred_on);

create or replace view public.vw_gastos_por_categoria_mensal
with (security_invoker = true) as
select user_id,
       date_trunc('month', occurred_on)::date as month,
       category,
       category_id,
       sum(amount) as total
from public.transactions
where type in ('expense','benefit')
group by user_id, date_trunc('month', occurred_on), category, category_id;

create or replace view public.vw_evolucao_investimentos
with (security_invoker = true) as
select i.user_id,
       s.snapshot_date,
       i.type as investment_type,
       sum(i.invested_amount) as total_invested,
       sum(s.current_value) as total_current
from public.investments i
join public.investment_snapshots s on s.investment_id = i.id
group by i.user_id, s.snapshot_date, i.type;

create or replace view public.vw_uber_resumo_diario
with (security_invoker = true) as
select user_id,
       occurred_on,
       sum(gross_revenue) as revenue,
       sum(energy_or_fuel_cost) as fuel_cost,
       sum(other_costs) as other_costs,
       sum(net_profit) as profit,
       sum(kilometers) as km,
       lag(sum(net_profit)) over (partition by user_id order by occurred_on) as prev_day_profit
from public.uber_daily_entries
group by user_id, occurred_on;

create or replace view public.vw_fatura_cartao_mensal
with (security_invoker = true) as
select t.credit_card_id,
       cc.user_id,
       cc.nickname,
       coalesce(t.bill_reference, to_char(t.occurred_on, 'YYYY-MM')) as reference_month,
       sum(t.amount) as total
from public.transactions t
join public.credit_cards cc on cc.id = t.credit_card_id
where t.credit_card_id is not null
group by t.credit_card_id, cc.user_id, cc.nickname,
         coalesce(t.bill_reference, to_char(t.occurred_on, 'YYYY-MM'));
