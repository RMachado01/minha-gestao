-- Notificações push (Web Push / VAPID).
-- Guarda as inscrições de push do navegador de cada usuário e as preferências
-- de quais avisos enviar. O envio em si é feito pelo servidor (web-push).

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_success_at timestamptz
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Cada usuário só enxerga e gerencia as próprias inscrições. O envio pelo
-- servidor usa a service role (fora da RLS).
drop policy if exists "push_subscriptions_owner" on public.push_subscriptions;
create policy "push_subscriptions_owner" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Preferências de notificação no perfil (ligadas por padrão).
alter table public.profiles add column if not exists notify_bills boolean not null default true;
alter table public.profiles add column if not exists notify_budgets boolean not null default true;
