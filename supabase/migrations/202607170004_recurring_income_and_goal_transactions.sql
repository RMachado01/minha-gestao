-- Renda recorrente (salário), crédito recorrente de VR/VA e aportes/retiradas
-- de metas passam a gerar lançamentos reais (antes só atualizavam o valor
-- guardado da meta, sem refletir no fluxo de caixa).

-- 1. "income" passa a ser um tipo válido de recorrência (salário e outras
-- rendas fixas mensais), ao lado dos tipos de despesa já existentes.
alter table public.recurrence_rules drop constraint recurrence_rules_type_check;
alter table public.recurrence_rules add constraint recurrence_rules_type_check
  check (type in ('subscription', 'installment', 'fixed_bill', 'income'));

-- 2. Crédito mensal recorrente de VR/VA, configurado direto no cartão benefício.
alter table public.credit_cards
  add column if not exists benefit_credit_amount numeric(12,2) check (benefit_credit_amount is null or benefit_credit_amount > 0),
  add column if not exists benefit_credit_day smallint check (benefit_credit_day is null or benefit_credit_day between 1 and 31);

-- 3. Aporte/retirada de meta agora também grava um lançamento (despesa para
-- aporte, receita para retirada) — o valor guardado deixa de ser só um
-- número na meta e passa a refletir de verdade no extrato/fluxo de caixa.
create or replace function public.record_goal_event(
  p_goal_id uuid,
  p_event_type text,
  p_amount numeric default null,
  p_description text default null,
  p_occurred_on date default current_date
)
returns public.goal_events
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_event public.goal_events;
  v_goal_name text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_event_type not in ('contribution', 'withdrawal', 'milestone', 'note') then
    raise exception 'Invalid event type';
  end if;

  select name into v_goal_name
  from public.financial_goals
  where id = p_goal_id and user_id = v_user_id;

  if v_goal_name is null then
    raise exception 'Goal not found';
  end if;

  insert into public.goal_events (goal_id, user_id, event_type, amount, description, occurred_on)
  values (p_goal_id, v_user_id, p_event_type, p_amount, nullif(trim(p_description), ''), p_occurred_on)
  returning * into v_event;

  if p_event_type = 'contribution' then
    update public.financial_goals
    set current_amount = current_amount + p_amount, updated_at = now()
    where id = p_goal_id and user_id = v_user_id;

    insert into public.transactions (user_id, type, amount, occurred_on, description, category, recurring, idempotency_key)
    values (v_user_id, 'expense', p_amount, p_occurred_on, 'Aporte: ' || v_goal_name, 'Metas', false, 'goal_event:' || v_event.id);
  elsif p_event_type = 'withdrawal' then
    update public.financial_goals
    set current_amount = greatest(0, current_amount - p_amount), updated_at = now()
    where id = p_goal_id and user_id = v_user_id;

    insert into public.transactions (user_id, type, amount, occurred_on, description, category, recurring, idempotency_key)
    values (v_user_id, 'income', p_amount, p_occurred_on, 'Retirada: ' || v_goal_name, 'Metas', false, 'goal_event:' || v_event.id);
  end if;

  return v_event;
end;
$$;

revoke all on function public.record_goal_event(uuid, text, numeric, text, date) from public, anon;
grant execute on function public.record_goal_event(uuid, text, numeric, text, date) to authenticated;
