-- Persist both paid-driving days and personal vehicle usage in the existing
-- daily vehicle ledger without mixing garage costs into Uber analytics.

alter table public.uber_daily_entries
  add column entry_kind text not null default 'uber'
    check (entry_kind in ('uber', 'garage')),
  add column hours_worked numeric(6,2)
    check (hours_worked is null or hours_worked >= 0),
  add column odometer_start numeric(12,2),
  add column odometer_end numeric(12,2),
  add constraint uber_daily_entries_odometer_check check (
    (odometer_start is null and odometer_end is null)
    or (
      odometer_start is not null
      and odometer_end is not null
      and odometer_start >= 0
      and odometer_end >= odometer_start
    )
  );

create index uber_daily_entries_user_kind_date_idx
  on public.uber_daily_entries (user_id, entry_kind, occurred_on desc);

-- Existing rows predate entry_kind and receive the default 'uber'. Personal
-- garage entries are excluded explicitly from revenue/profit aggregates.
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
where entry_kind = 'uber'
group by user_id, occurred_on;
