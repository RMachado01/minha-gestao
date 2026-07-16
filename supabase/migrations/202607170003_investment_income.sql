-- Migration: proventos (dividendos/juros/rendimentos) e metadados extras de investimento.
-- Depends on: 202607120002_complete_schema.sql

alter table public.investments
  add column if not exists ticker text,
  add column if not exists maturity_date date,
  add column if not exists notes text,
  add column if not exists archived boolean not null default false;

create table public.investment_income (
  id uuid primary key default gen_random_uuid(),
  investment_id uuid not null references public.investments(id) on delete cascade,
  type text not null check (type in ('dividendo','jcp','rendimento','juros','outro')),
  amount numeric(12,2) not null check (amount > 0),
  payment_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.investment_income enable row level security;

create policy "income_via_investment" on public.investment_income for all
  using (exists(select 1 from public.investments i where i.id = investment_id and i.user_id = auth.uid()))
  with check (exists(select 1 from public.investments i where i.id = investment_id and i.user_id = auth.uid()));

create index income_investment_date_idx on public.investment_income(investment_id, payment_date desc);
