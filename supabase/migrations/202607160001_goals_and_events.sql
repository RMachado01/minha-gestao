-- Goals, contributions and timeline events.
-- Run after 202607150001_security_hardening.sql.

create table public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  goal_type text not null check (goal_type in ('reserve', 'vehicle', 'home', 'travel', 'education', 'retirement', 'other')),
  description text check (description is null or char_length(description) <= 600),
  target_amount numeric(12,2) not null check (target_amount > 0),
  current_amount numeric(12,2) not null default 0 check (current_amount >= 0),
  contribution_mode text not null check (contribution_mode in ('fixed', 'percentage')),
  contribution_value numeric(12,2) not null check (contribution_value > 0),
  target_date date,
  preferred_scenario text not null default 'cdb' check (preferred_scenario in ('savings', 'cdb', 'treasury', 'dividends', 'custom')),
  custom_annual_rate numeric(6,3) check (custom_annual_rate is null or custom_annual_rate between 0 and 100),
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goal_events (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.financial_goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('contribution', 'withdrawal', 'milestone', 'note')),
  amount numeric(12,2) check (
    (event_type in ('contribution', 'withdrawal') and amount is not null and amount > 0)
    or (event_type in ('milestone', 'note') and amount is null)
  ),
  description text check (description is null or char_length(description) <= 400),
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index financial_goals_user_status_idx on public.financial_goals(user_id, status, created_at desc);
create index goal_events_goal_date_idx on public.goal_events(goal_id, occurred_on desc, created_at desc);

alter table public.financial_goals enable row level security;
alter table public.goal_events enable row level security;

create policy "financial_goals_owner" on public.financial_goals
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "goal_events_read_own" on public.goal_events
  for select to authenticated using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.financial_goals goal
      where goal.id = goal_id and goal.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.financial_goals to authenticated;
grant select on public.goal_events to authenticated;

-- Records a contribution/withdrawal and updates progress in one transaction.
create or replace function public.record_goal_event(
  p_goal_id uuid,
  p_event_type text,
  p_amount numeric default null,
  p_description text default null,
  p_occurred_on date default current_date
)
returns public.goal_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_event public.goal_events;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_event_type not in ('contribution', 'withdrawal', 'milestone', 'note') then
    raise exception 'Invalid event type';
  end if;

  if not exists (
    select 1 from public.financial_goals
    where id = p_goal_id and user_id = v_user_id
  ) then
    raise exception 'Goal not found';
  end if;

  insert into public.goal_events (goal_id, user_id, event_type, amount, description, occurred_on)
  values (p_goal_id, v_user_id, p_event_type, p_amount, nullif(trim(p_description), ''), p_occurred_on)
  returning * into v_event;

  if p_event_type = 'contribution' then
    update public.financial_goals
    set current_amount = current_amount + p_amount, updated_at = now()
    where id = p_goal_id and user_id = v_user_id;
  elsif p_event_type = 'withdrawal' then
    update public.financial_goals
    set current_amount = greatest(0, current_amount - p_amount), updated_at = now()
    where id = p_goal_id and user_id = v_user_id;
  end if;

  return v_event;
end;
$$;

revoke all on function public.record_goal_event(uuid, text, numeric, text, date) from public, anon;
grant execute on function public.record_goal_event(uuid, text, numeric, text, date) to authenticated;
