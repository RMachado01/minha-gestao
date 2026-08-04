-- Garagem profissional: custo total de propriedade (TCO) e manutenção preventiva.
--
-- Antes, a garagem só media custo variável do trajeto (combustível + extras).
-- Na prática, custos fixos (IPVA, seguro, licenciamento e depreciação) costumam
-- responder por mais da metade do custo real por km — sem eles o número exibido
-- subestima bastante o que o veículo custa.

-- ── 1. Dados do veículo: identificação, odômetro e custos fixos anuais ──
alter table public.vehicles
  add column if not exists plate text,
  add column if not exists odometer numeric(12,2) not null default 0
    check (odometer >= 0),
  add column if not exists purchase_price numeric(12,2)
    check (purchase_price is null or purchase_price >= 0),
  add column if not exists purchase_date date,
  add column if not exists ipva_annual numeric(12,2) not null default 0
    check (ipva_annual >= 0),
  add column if not exists insurance_annual numeric(12,2) not null default 0
    check (insurance_annual >= 0),
  add column if not exists licensing_annual numeric(12,2) not null default 0
    check (licensing_annual >= 0),
  -- Depreciação anual em % sobre o valor de compra (padrão de mercado: ~10%).
  add column if not exists depreciation_rate numeric(5,2) not null default 10
    check (depreciation_rate >= 0 and depreciation_rate <= 100);

-- ── 2. Manutenções: histórico + próxima prevista (por km e/ou data) ──
create table if not exists public.vehicle_maintenances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  kind text not null check (kind in (
    'oil', 'tires', 'brakes', 'revision', 'filter', 'battery', 'alignment', 'other'
  )),
  description text check (description is null or char_length(description) <= 300),
  occurred_on date not null default current_date,
  odometer numeric(12,2) check (odometer is null or odometer >= 0),
  cost numeric(12,2) not null default 0 check (cost >= 0),
  -- Próxima ocorrência prevista: por quilometragem e/ou por data.
  next_due_km numeric(12,2) check (next_due_km is null or next_due_km >= 0),
  next_due_date date,
  created_at timestamptz not null default now()
);

create index if not exists vehicle_maintenances_user_vehicle_idx
  on public.vehicle_maintenances (user_id, vehicle_id, occurred_on desc);

alter table public.vehicle_maintenances enable row level security;

-- Mesmo padrão dos veículos: dado pessoal, sem compartilhamento por household.
drop policy if exists "vehicle_maintenances_owner" on public.vehicle_maintenances;
create policy "vehicle_maintenances_owner" on public.vehicle_maintenances
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── 3. Odômetro do veículo acompanha o maior valor já registrado ──
-- Registros de uso informam odometer_end; manter o veículo sincronizado evita
-- que o usuário precise atualizar a quilometragem manualmente.
create or replace function public.sync_vehicle_odometer()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if NEW.odometer_end is not null and NEW.vehicle_id is not null then
    update public.vehicles
      set odometer = greatest(coalesce(odometer, 0), NEW.odometer_end)
      where id = NEW.vehicle_id and user_id = NEW.user_id;
  end if;
  return NEW;
end;
$$;

revoke all on function public.sync_vehicle_odometer() from public, anon, authenticated;

drop trigger if exists sync_vehicle_odometer on public.uber_daily_entries;
create trigger sync_vehicle_odometer
  after insert or update of odometer_end on public.uber_daily_entries
  for each row execute function public.sync_vehicle_odometer();
