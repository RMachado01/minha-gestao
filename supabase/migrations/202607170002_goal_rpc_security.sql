-- Run goal-event writes with caller privileges; RLS remains authoritative.

create policy "goal_events_insert_own" on public.goal_events
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.financial_goals goal
      where goal.id = goal_id and goal.user_id = (select auth.uid())
    )
  );

grant insert on public.goal_events to authenticated;

alter function public.record_goal_event(uuid, text, numeric, text, date)
  security invoker;

create index goal_events_user_id_idx on public.goal_events(user_id);
