-- Conta conjunta: código de convite + visibilidade compartilhada por household,
-- mantendo a EDIÇÃO restrita ao dono de cada registro (modelo "ver junto, cada
-- um edita o seu"). Segurança: SELECT liberado para co-membros; INSERT/UPDATE/
-- DELETE continua exigindo user_id = auth.uid().

-- ── Helpers (SECURITY DEFINER para evitar recursão de RLS) ──
create or replace function public.my_household_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select household_id from public.household_members
  where user_id = auth.uid() and status = 'active';
$$;

create or replace function public.current_household()
returns uuid language sql stable security definer set search_path = '' as $$
  select household_id from public.household_members
  where user_id = auth.uid() and status = 'active' limit 1;
$$;

revoke all on function public.my_household_ids() from public, anon;
revoke all on function public.current_household() from public, anon;
grant execute on function public.my_household_ids() to authenticated;
grant execute on function public.current_household() to authenticated;

-- ── Código de convite na household ──
alter table public.households add column if not exists join_code text;
alter table public.households add column if not exists join_code_expires_at timestamptz;
create unique index if not exists households_join_code_idx on public.households(join_code) where join_code is not null;

-- Membros conseguem ler a household a que pertencem (nome/código).
drop policy if exists "households_member_read" on public.households;
create policy "households_member_read" on public.households
  for select to authenticated
  using (owner_id = (select auth.uid()) or id in (select public.my_household_ids()));

-- Co-membros conseguem enxergar uns aos outros.
drop policy if exists "membership_visible" on public.household_members;
create policy "membership_visible" on public.household_members
  for select to authenticated
  using (user_id = (select auth.uid()) or household_id in (select public.my_household_ids()));

-- ── Trigger que carimba household_id nos novos registros ──
create or replace function public.stamp_household()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if NEW.household_id is null then
    NEW.household_id := public.current_household();
  end if;
  return NEW;
end;
$$;
-- Função de trigger não deve ser exposta como RPC (o trigger dispara mesmo
-- sem EXECUTE concedido, pois roda com o dono da tabela).
revoke all on function public.stamp_household() from public, anon, authenticated;

-- ── Aplica household_id + trigger + RLS (SELECT compartilhado / escrita própria)
--    em cada tabela financeira compartilhável ──
do $$
declare
  t text; oldp text;
begin
  for t, oldp in
    select * from (values
      ('transactions', 'transactions_owner'),
      ('credit_cards', 'cards_owner'),
      ('recurrence_rules', 'recurrence_owner'),
      ('financial_goals', 'financial_goals_owner'),
      ('investments', 'investments_owner'),
      ('categories', 'categories_owner'),
      ('category_budgets', 'category_budgets_owner'),
      ('spending_alerts', 'spending_alerts_owner')
    ) as x(t, oldp)
  loop
    execute format('alter table public.%I add column if not exists household_id uuid references public.households(id)', t);
    execute format('create index if not exists %I on public.%I(household_id)', t || '_household_idx', t);
    execute format('drop trigger if exists stamp_household on public.%I', t);
    execute format('create trigger stamp_household before insert on public.%I for each row execute function public.stamp_household()', t);
    execute format('drop policy if exists %I on public.%I', oldp, t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_modify', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()) or (household_id is not null and household_id in (select public.my_household_ids())))',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || '_modify', t);
  end loop;
end;
$$;

-- Carimba as linhas já existentes do usuário para a household informada.
create or replace function public._backfill_household(hid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare t text;
begin
  foreach t in array array['transactions','credit_cards','recurrence_rules','financial_goals','investments','categories','category_budgets','spending_alerts'] loop
    execute format('update public.%I set household_id = $1 where user_id = auth.uid() and household_id is null', t) using hid;
  end loop;
end;
$$;

-- ── RPCs: gerar convite, ingressar por código, sair ──
create or replace function public.create_household_invite()
returns text language plpgsql security definer set search_path = '' as $$
declare hid uuid; code text;
begin
  hid := public.current_household();
  if hid is null then
    insert into public.households (name, owner_id) values ('Conta conjunta', auth.uid()) returning id into hid;
    insert into public.household_members (household_id, user_id, role, status)
      values (hid, auth.uid(), 'owner', 'active') on conflict do nothing;
  end if;
  code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  update public.households set join_code = code, join_code_expires_at = now() + interval '7 days' where id = hid;
  perform public._backfill_household(hid);
  return code;
end;
$$;

create or replace function public.join_household_by_code(p_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare hid uuid; hname text;
begin
  if public.current_household() is not null then
    raise exception 'already_in_household';
  end if;
  select id, name into hid, hname from public.households
    where join_code = upper(trim(p_code))
      and (join_code_expires_at is null or join_code_expires_at > now());
  if hid is null then
    raise exception 'invalid_code';
  end if;
  insert into public.household_members (household_id, user_id, role, status)
    values (hid, auth.uid(), 'member', 'active') on conflict do nothing;
  perform public._backfill_household(hid);
  return hname;
end;
$$;

create or replace function public.leave_household()
returns void language plpgsql security definer set search_path = '' as $$
declare hid uuid; t text;
begin
  hid := public.current_household();
  if hid is null then return; end if;
  delete from public.household_members where household_id = hid and user_id = auth.uid();
  foreach t in array array['transactions','credit_cards','recurrence_rules','financial_goals','investments','categories','category_budgets','spending_alerts'] loop
    execute format('update public.%I set household_id = null where user_id = auth.uid() and household_id = $1', t) using hid;
  end loop;
end;
$$;

revoke all on function public._backfill_household(uuid) from public, anon, authenticated;
revoke all on function public.create_household_invite() from public, anon;
revoke all on function public.join_household_by_code(text) from public, anon;
revoke all on function public.leave_household() from public, anon;
grant execute on function public.create_household_invite() to authenticated;
grant execute on function public.join_household_by_code(text) to authenticated;
grant execute on function public.leave_household() to authenticated;
