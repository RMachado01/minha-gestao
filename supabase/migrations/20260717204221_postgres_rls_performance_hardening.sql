-- Postgres/RLS hardening for the existing schema (applied remotely).
-- Keeps the current ownership and household access model unchanged while:
--   * indexing foreign-key columns used by joins and cascading deletes;
--   * evaluating auth.uid() once per statement through an initPlan;
--   * limiting private-data policies to authenticated requests;
--   * avoiding overlapping permissive SELECT policies on household_members.

-- Foreign-key indexes. Postgres does not create indexes for referencing
-- columns automatically. `if not exists` keeps this migration retry-safe.
create index if not exists credit_cards_household_id_idx
  on public.credit_cards (household_id);

create index if not exists household_members_user_id_idx
  on public.household_members (user_id);

create index if not exists households_owner_id_idx
  on public.households (owner_id);

create index if not exists recurrence_rules_category_id_idx
  on public.recurrence_rules (category_id);

create index if not exists transactions_category_id_idx
  on public.transactions (category_id);

create index if not exists transactions_household_id_idx
  on public.transactions (household_id);

create index if not exists transactions_recurrence_id_idx
  on public.transactions (recurrence_id);

create index if not exists uber_daily_entries_vehicle_id_idx
  on public.uber_daily_entries (vehicle_id);

create index if not exists vehicles_user_id_idx
  on public.vehicles (user_id);

-- Direct ownership policies.
drop policy if exists "profile_owner" on public.profiles;
create policy "profile_owner" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "household_owner" on public.households;
create policy "household_owner" on public.households
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "vehicles_owner" on public.vehicles;
create policy "vehicles_owner" on public.vehicles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "uber_entries_owner" on public.uber_daily_entries;
create policy "uber_entries_owner" on public.uber_daily_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "categories_owner" on public.categories;
create policy "categories_owner" on public.categories
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "recurrence_owner" on public.recurrence_rules;
create policy "recurrence_owner" on public.recurrence_rules
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "investments_owner" on public.investments;
create policy "investments_owner" on public.investments
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Indirect ownership policies.
drop policy if exists "snapshots_via_investment" on public.investment_snapshots;
create policy "snapshots_via_investment" on public.investment_snapshots
  for all to authenticated
  using (
    exists (
      select 1
      from public.investments investment
      where investment.id = investment_snapshots.investment_id
        and investment.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.investments investment
      where investment.id = investment_snapshots.investment_id
        and investment.user_id = (select auth.uid())
    )
  );

drop policy if exists "bills_via_card" on public.credit_card_bills;
create policy "bills_via_card" on public.credit_card_bills
  for all to authenticated
  using (
    exists (
      select 1
      from public.credit_cards card
      where card.id = credit_card_bills.credit_card_id
        and card.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.credit_cards card
      where card.id = credit_card_bills.credit_card_id
        and card.user_id = (select auth.uid())
    )
  );

drop policy if exists "income_via_investment" on public.investment_income;
create policy "income_via_investment" on public.investment_income
  for all to authenticated
  using (
    exists (
      select 1
      from public.investments investment
      where investment.id = investment_income.investment_id
        and investment.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.investments investment
      where investment.id = investment_income.investment_id
        and investment.user_id = (select auth.uid())
    )
  );

-- Consent audit logs remain append-only for authenticated users.
drop policy if exists "consent_logs_read_own" on public.consent_logs;
create policy "consent_logs_read_own" on public.consent_logs
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "consent_logs_insert_own" on public.consent_logs;
create policy "consent_logs_insert_own" on public.consent_logs
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Household members keep the original access rules:
--   * members can see their own membership;
--   * household owners can see and manage every membership in their household.
-- Management is split by command so it no longer overlaps the SELECT policy.
drop policy if exists "membership_visible" on public.household_members;
drop policy if exists "membership_owner_manage" on public.household_members;
drop policy if exists "membership_owner_insert" on public.household_members;
drop policy if exists "membership_owner_update" on public.household_members;
drop policy if exists "membership_owner_delete" on public.household_members;

create policy "membership_visible" on public.household_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.households household
      where household.id = household_members.household_id
        and household.owner_id = (select auth.uid())
    )
  );

create policy "membership_owner_insert" on public.household_members
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.households household
      where household.id = household_members.household_id
        and household.owner_id = (select auth.uid())
    )
  );

create policy "membership_owner_update" on public.household_members
  for update to authenticated
  using (
    exists (
      select 1
      from public.households household
      where household.id = household_members.household_id
        and household.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.households household
      where household.id = household_members.household_id
        and household.owner_id = (select auth.uid())
    )
  );

create policy "membership_owner_delete" on public.household_members
  for delete to authenticated
  using (
    exists (
      select 1
      from public.households household
      where household.id = household_members.household_id
        and household.owner_id = (select auth.uid())
    )
  );

-- This privileged RPC must stay in the exposed public schema because the
-- frontend calls it through PostgREST. Its explicit auth.uid() ownership check,
-- empty search_path and narrow EXECUTE grant contain the SECURITY DEFINER scope.
-- Moving it to a private schema would break the existing account-deletion flow.
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

comment on function public.delete_own_account() is
  'LGPD self-service deletion. SECURITY DEFINER is intentional; execution is restricted to authenticated users and the function deletes only the current caller.';
