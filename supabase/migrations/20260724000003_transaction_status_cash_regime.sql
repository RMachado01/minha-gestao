-- Status da transação passa a ter efeito (regime de caixa).
-- Antes, o status (pending/paid/received) era decorativo: o saldo somava tudo.
-- Agora só transações EFETIVADAS (paid/received) entram no saldo/gastos; as
-- "pendentes" viram "a pagar / a receber", fora do saldo, até serem quitadas.
--
-- Para não sumir dados históricos do saldo (o padrão antigo criava despesa como
-- 'pending'), fazemos:
--   1. o novo padrão da coluna é 'paid' (todo lançamento nasce efetivado);
--   2. backfill: tudo que estava 'pending' vira efetivado (paid/received).
-- Assim o comportamento padrão continua idêntico; "pendente" passa a ser
-- opt-in explícito no formulário de novo lançamento.

-- 1. Novo padrão: lançamento nasce efetivado.
alter table public.transactions alter column status set default 'paid';

-- 2. Backfill dos dados existentes (nada deve cair do saldo).
update public.transactions set status = 'received' where status = 'pending' and type = 'income';
update public.transactions set status = 'paid'     where status = 'pending' and type in ('expense', 'benefit');

-- 3. Views passam a considerar só o que foi efetivado (paid/received).
create or replace view public.vw_resumo_mensal
with (security_invoker = true) as
select user_id,
       date_trunc('month', occurred_on)::date as month,
       sum(case when type = 'income' then amount else 0 end) as total_income,
       sum(case when type in ('expense','benefit') then amount else 0 end) as total_expenses,
       sum(case when type = 'income' then amount else 0 end)
         - sum(case when type in ('expense','benefit') then amount else 0 end) as balance
from public.transactions
where status in ('paid', 'received')
group by user_id, date_trunc('month', occurred_on);

create or replace view public.vw_gastos_por_categoria_mensal
with (security_invoker = true) as
select user_id,
       date_trunc('month', occurred_on)::date as month,
       category,
       category_id,
       sum(amount) as total
from public.transactions
where type in ('expense','benefit')
  and status in ('paid', 'received')
group by user_id, date_trunc('month', occurred_on), category, category_id;
