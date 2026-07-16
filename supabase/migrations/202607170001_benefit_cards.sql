-- Benefit cards (VR/VA) with atomic balance debit.
-- Run after 202607160001_goals_and_events.sql.

alter table public.credit_cards
  add column card_type text not null default 'credit'
    check (card_type in ('credit', 'benefit')),
  add column benefit_mode text
    check (benefit_mode is null or benefit_mode in ('separate', 'flex')),
  add column vr_balance numeric(12,2) not null default 0
    check (vr_balance >= 0),
  add column va_balance numeric(12,2) not null default 0
    check (va_balance >= 0),
  add column flex_balance numeric(12,2) not null default 0
    check (flex_balance >= 0);

alter table public.credit_cards
  add constraint credit_cards_benefit_configuration_check check (
    (card_type = 'credit' and benefit_mode is null)
    or (card_type = 'benefit' and benefit_mode in ('separate', 'flex'))
  );

create index credit_cards_user_type_active_idx
  on public.credit_cards(user_id, card_type, active);

create index if not exists transactions_credit_card_id_idx
  on public.transactions(credit_card_id)
  where credit_card_id is not null;

-- Scope existing ownership policies to signed-in users and cache auth.uid per statement.
drop policy if exists "cards_owner" on public.credit_cards;
create policy "cards_owner" on public.credit_cards
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "transactions_owner" on public.transactions;
create policy "transactions_owner" on public.transactions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Trigger-only function: it must not be callable through /rest/v1/rpc.
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- A benefit purchase and its balance debit must succeed or fail together.
create or replace function public.register_benefit_purchase(
  p_credit_card_id uuid,
  p_amount numeric,
  p_benefit_kind text,
  p_occurred_on date,
  p_description text,
  p_idempotency_key text
)
returns public.transactions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_card public.credit_cards;
  v_kind text;
  v_transaction public.transactions;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  if nullif(trim(p_description), '') is null then
    raise exception 'Description is required';
  end if;

  select * into v_card
  from public.credit_cards
  where id = p_credit_card_id
    and user_id = v_user_id
    and active = true
    and card_type = 'benefit'
  for update;

  if not found then
    raise exception 'Benefit card not found';
  end if;

  if v_card.benefit_mode = 'flex' then
    v_kind := 'flex';
    if v_card.flex_balance < p_amount then
      raise exception 'Insufficient flex balance';
    end if;
    update public.credit_cards
      set flex_balance = flex_balance - p_amount
      where id = v_card.id and user_id = v_user_id;
  elsif p_benefit_kind = 'vr' then
    v_kind := 'vr';
    if v_card.vr_balance < p_amount then
      raise exception 'Insufficient VR balance';
    end if;
    update public.credit_cards
      set vr_balance = vr_balance - p_amount
      where id = v_card.id and user_id = v_user_id;
  elsif p_benefit_kind = 'va' then
    v_kind := 'va';
    if v_card.va_balance < p_amount then
      raise exception 'Insufficient VA balance';
    end if;
    update public.credit_cards
      set va_balance = va_balance - p_amount
      where id = v_card.id and user_id = v_user_id;
  else
    raise exception 'Choose VR or VA for this card';
  end if;

  insert into public.transactions (
    user_id,
    credit_card_id,
    type,
    amount,
    occurred_on,
    description,
    category,
    payment_method,
    benefit_kind,
    recurring,
    idempotency_key,
    origin,
    status
  ) values (
    v_user_id,
    v_card.id,
    'expense',
    p_amount,
    coalesce(p_occurred_on, current_date),
    trim(p_description),
    'Alimentação',
    'benefit',
    v_kind,
    false,
    p_idempotency_key,
    'expense',
    'paid'
  )
  returning * into v_transaction;

  return v_transaction;
end;
$$;

revoke all on function public.register_benefit_purchase(uuid, numeric, text, date, text, text)
  from public, anon;
grant execute on function public.register_benefit_purchase(uuid, numeric, text, date, text, text)
  to authenticated;

-- Benefit purchases must never inflate a credit-card invoice.
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
  and cc.card_type = 'credit'
group by t.credit_card_id, cc.user_id, cc.nickname,
         coalesce(t.bill_reference, to_char(t.occurred_on, 'YYYY-MM'));
