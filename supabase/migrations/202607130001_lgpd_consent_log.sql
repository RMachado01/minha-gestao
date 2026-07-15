-- Migration: LGPD compliance — consent log table
-- Records date/time/IP of terms acceptance for legal audit

create table public.consent_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (consent_type in ('terms_of_use', 'privacy_policy')),
  version text not null default '1.0',
  ip_address text,
  user_agent text,
  accepted_at timestamptz not null default now()
);

create index consent_logs_user_idx on public.consent_logs(user_id);

alter table public.consent_logs enable row level security;

-- Users can read their own consent logs; inserts allowed for authenticated users
create policy "consent_logs_read_own" on public.consent_logs
  for select using (user_id = auth.uid());

create policy "consent_logs_insert_own" on public.consent_logs
  for insert with check (user_id = auth.uid());

-- RPC for account self-deletion (LGPD Art. 18 — right to erasure)
-- Deletes the user from auth.users; all public.* data cascades via ON DELETE CASCADE.
create or replace function public.delete_own_account()
returns void as $$
begin
  -- Delete from auth.users cascades to profiles, transactions, cards, etc.
  delete from auth.users where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = '';

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
