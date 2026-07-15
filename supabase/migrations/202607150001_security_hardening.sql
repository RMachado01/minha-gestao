-- Security hardening for existing databases.
-- Safe to run after the first three migrations.

alter view public.vw_resumo_mensal set (security_invoker = true);
alter view public.vw_gastos_por_categoria_mensal set (security_invoker = true);
alter view public.vw_evolucao_investimentos set (security_invoker = true);
alter view public.vw_uber_resumo_diario set (security_invoker = true);
alter view public.vw_fatura_cartao_mensal set (security_invoker = true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
