create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', phone text, state_code char(2), currency char(3) not null default 'BRL',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.households (
  id uuid primary key default gen_random_uuid(), name text not null, owner_id uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.household_members (
  household_id uuid references public.households(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','member','viewer')), status text not null default 'pending', primary key (household_id,user_id)
);
create table public.credit_cards (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), household_id uuid references public.households(id),
  nickname text not null, brand text not null, total_limit numeric(12,2) not null check(total_limit >= 0), closing_day smallint not null check(closing_day between 1 and 31), due_day smallint not null check(due_day between 1 and 31), color text, active boolean not null default true, created_at timestamptz not null default now()
);
create table public.transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), household_id uuid references public.households(id), credit_card_id uuid references public.credit_cards(id),
  type text not null check(type in ('income','expense','benefit')), amount numeric(12,2) not null check(amount > 0), occurred_on date not null, description text not null, category text not null,
  payment_method text, benefit_kind text, recurring boolean not null default false, idempotency_key text not null, created_at timestamptz not null default now(), unique(user_id,idempotency_key)
);
create table public.vehicles (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), brand text not null, model text not null, year smallint not null,
  state_code char(2) not null, powertrain text not null check(powertrain in ('combustion','hybrid','electric')), efficiency numeric(12,3), unit_price numeric(12,4), active boolean not null default true
);
create table public.uber_daily_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), vehicle_id uuid references public.vehicles(id), occurred_on date not null,
  kilometers numeric(12,2) not null check(kilometers > 0), gross_revenue numeric(12,2) not null, consumed_units numeric(12,3) not null, energy_or_fuel_cost numeric(12,2) not null,
  other_costs numeric(12,2) not null default 0, net_profit numeric(12,2) not null, idempotency_key text not null, unique(user_id,idempotency_key)
);

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.credit_cards enable row level security;
alter table public.transactions enable row level security;
alter table public.vehicles enable row level security;
alter table public.uber_daily_entries enable row level security;

create policy "profile_owner" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "household_owner" on public.households for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "membership_visible" on public.household_members for select using (user_id = auth.uid() or exists(select 1 from public.households h where h.id=household_id and h.owner_id=auth.uid()));
create policy "membership_owner_manage" on public.household_members for all using (exists(select 1 from public.households h where h.id=household_id and h.owner_id=auth.uid())) with check (exists(select 1 from public.households h where h.id=household_id and h.owner_id=auth.uid()));
create policy "cards_owner" on public.credit_cards for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "transactions_owner" on public.transactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "vehicles_owner" on public.vehicles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "uber_entries_owner" on public.uber_daily_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index transactions_user_date_idx on public.transactions(user_id, occurred_on desc);
create index uber_entries_user_date_idx on public.uber_daily_entries(user_id, occurred_on desc);
create index cards_user_idx on public.credit_cards(user_id);
