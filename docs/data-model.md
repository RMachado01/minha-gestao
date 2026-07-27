# Modelo de dados (Postgres / Supabase)

A **fonte de verdade do schema são as migrations** em `supabase/migrations/`.
Este documento resume as tabelas, as políticas RLS e as funções. Ao divergir,
o SQL manda.

## Princípio de segurança: RLS em tudo

Todas as tabelas de dados de usuário têm **Row-Level Security** habilitada. O
padrão de política é:

```sql
create policy "<tabela>_owner" on public.<tabela>
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
```

Notas importantes:

- `(select auth.uid())` (em subselect) é intencional — o hardening de RLS
  (`20260717204221_postgres_rls_performance_hardening.sql`) avalia `auth.uid()`
  uma vez por statement, não por linha (performance).
- `to authenticated` restringe a política ao papel de usuário logado.
- Tabelas compartilháveis (conta conjunta) têm um par de políticas
  `_select` (leitura compartilhada) + `_modify` (escrita própria) — ver seção
  [Conta conjunta](#conta-conjunta-household).

## Tabelas

### Núcleo

| Tabela | Propósito | Colunas-chave |
|---|---|---|
| `profiles` | Perfil do usuário (1:1 com `auth.users`) | `id`, `full_name`, `phone`, `state_code`, `currency`, `notify_bills`, `notify_budgets` |
| `transactions` | Lançamentos (receitas/despesas/benefício) | ver abaixo |
| `categories` | Categorias do usuário | `name`, `type` (income/expense), `color`, `icon` |
| `recurrence_rules` | Recorrências (assinatura/parcela/conta fixa) | `type`, `amount`, `day_of_month`, `start_date`, `end_date`, `total_installments`, `current_installment`, `active` |

> `notify_bills`/`notify_budgets` foram acrescentadas pela migration
> `push_notifications`. O tour de onboarding **não** usa coluna no banco — o
> "já vi o tour" é guardado no `localStorage` por dispositivo.

**`transactions`** (colunas relevantes):

| Coluna | Tipo | Observação |
|---|---|---|
| `type` | text | `income` / `expense` / `benefit` |
| `amount` | numeric(12,2) | sempre > 0 |
| `occurred_on` | date | data do lançamento |
| `description`, `category` | text | |
| `category_id` | uuid | FK opcional para `categories` |
| `payment_method` | text | inclui `credit` (cartão) |
| `credit_card_id` | uuid | FK quando pago no cartão |
| `origin` | text | `fixed_income`/`variable_income`/`expense`/`recurring_expense` |
| `status` | text | `pending`/`paid`/`received`. Default `paid`. **Regime de caixa** (ver abaixo) |
| `recurring`, `recurrence_id` | bool/uuid | ligação com `recurrence_rules` |
| `installments_total`, `current_installment` | smallint | parcelamento de cartão |
| `bill_reference` | char(7) | `YYYY-MM` da fatura em que a parcela cai |
| `idempotency_key` | text | `unique(user_id, idempotency_key)` — evita duplicidade |

> **`status` — regime de caixa.** Só transações efetivadas (`paid`/`received`)
> entram no saldo/gastos; `pending` conta como "a pagar / a receber", fora do
> saldo, até ser quitada. Filtragem em `lib/supabase/useFinanceSummary.ts`
> (que agrega no cliente) e, por consistência, nas views `vw_resumo_mensal` e
> `vw_gastos_por_categoria_mensal`. O padrão da coluna é `paid` (todo lançamento
> nasce efetivado); `pending` é opt-in no formulário. Migration:
> `20260724000003_transaction_status_cash_regime.sql`. Não confundir com
> `credit_card_bills.status` (open/closed/paid), que é separado.

### Cartões

| Tabela | Propósito |
|---|---|
| `credit_cards` | Cartões de crédito e de benefício (VR/VA/flex). Colunas: `nickname`, `brand`, `bank`, `total_limit`, `closing_day`, `due_day`, `card_type` (`credit`/`benefit`), `benefit_mode` (`separate`/`flex`), `vr_balance`, `va_balance`, `flex_balance`, `benefit_credit_amount`, `benefit_credit_day` |
| `credit_card_bills` | Fatura consolidada por mês. `reference_month` (char 7), `total_amount`, `status` (`open`/`closed`/`paid`) — **este status é funcional** |

### Metas e investimentos

| Tabela | Propósito |
|---|---|
| `financial_goals` | Metas/sonhos. `goal_type`, `target_amount`, `current_amount`, `contribution_mode` (fixed/percentage), `contribution_value`, `target_date`, `preferred_scenario` (savings/cdb/treasury/dividends/custom), `custom_annual_rate`, `status` (active/paused/completed/cancelled) |
| `goal_events` | Eventos da meta: `contribution`/`withdrawal`/`milestone`/`note` (aporte/retirada exigem `amount`) |
| `investments` | Aplicações. `type` (renda_fixa/renda_variavel/fundo/cripto/outro), `invested_amount`, `application_date`, `institution` |
| `investment_snapshots` | Valor atual da aplicação em uma data |
| `investment_income` | Proventos recebidos (dividendos/juros) |

### Orçamentos e alertas (planos personalizados)

| Tabela | Propósito |
|---|---|
| `category_budgets` | Teto de gasto por categoria (`category`, `limit_amount`, `active`, `unique(user_id, category)`). O gasto realizado é sempre derivado de `transactions`. |
| `spending_alerts` | Alertas: `category` (null = total do mês), `threshold_amount`, `period` (`monthly`) |

### Trabalho (motorista / veículos)

| Tabela | Propósito |
|---|---|
| `vehicles` | Veículos: `brand`, `model`, `year`, `powertrain` (combustion/hybrid/electric), `efficiency`, `unit_price` |
| `uber_daily_entries` | Diário de corridas: `kilometers`, `gross_revenue`, `consumed_units`, `energy_or_fuel_cost`, `other_costs`, `net_profit` |

### Conta conjunta (household)

| Tabela | Propósito |
|---|---|
| `households` | Grupo compartilhado. `name`, `owner_id`, `join_code`, `join_code_expires_at` |
| `household_members` | Membros: `(household_id, user_id)` PK, `role` (owner/manager/member/viewer), `status` (pending/active) |

### Notificações e conformidade

| Tabela | Propósito |
|---|---|
| `push_subscriptions` | Inscrições Web Push por dispositivo: `endpoint` (unique), `p256dh`, `auth`, `user_agent` |
| `consent_logs` | Registro de consentimento (LGPD) |
| `market_quote_cache` | Cache de cotações (alimentado por job externo; **read-only** para o usuário) |

## Views

Agregações prontas consumidas pelos hooks:

| View | Uso |
|---|---|
| `vw_resumo_mensal` | Resumo mensal (entradas/saídas/saldo) — `useFinanceSummary` |
| `vw_gastos_por_categoria_mensal` | Gastos por categoria no mês — Gastos / Planos |
| `vw_fatura_cartao_mensal` | Total da fatura por cartão e mês — `useCreditCards` |
| `vw_evolucao_investimentos` | Evolução do patrimônio investido |
| `vw_uber_resumo_diario` | KPIs do diário de corridas |

## Funções e RPCs

| Função | Tipo | Descrição |
|---|---|---|
| `handle_new_user()` | trigger | Cria `profiles` ao surgir novo `auth.users` |
| `delete_own_account()` | RPC (SECURITY DEFINER) | LGPD: apaga a conta e todos os dados do próprio usuário |
| `record_goal_event(...)` | RPC | Registra aporte/retirada e atualiza `current_amount` da meta com segurança |
| `register_benefit_purchase(...)` | RPC | Compra em cartão de benefício, descontando o saldo correto |
| `my_household_ids()` | SECURITY DEFINER | Households ativos do usuário (usada nas policies `_select`) |
| `current_household()` | SECURITY DEFINER | Household ativo atual (para carimbar `household_id`) |
| `stamp_household()` | trigger | Carimba `household_id` em novos registros; **sem EXECUTE público** |
| `_backfill_household(hid)` | interna | Marca linhas existentes ao entrar/gerar convite |
| `create_household_invite()` | RPC | Cria household (se não houver) e gera código de convite (8 chars, 7 dias) |
| `join_household_by_code(p_code)` | RPC | Ingressa numa household pelo código |
| `leave_household()` | RPC | Sai da household e "descarimba" as próprias linhas |

Detalhes do modelo de conta conjunta em [features.md](features.md#conta-conjunta).

## Migrations (ordem)

```
202607120001_initial_schema           202607170003_investment_income
202607120002_complete_schema          202607170004_recurring_income_and_goal_transactions
202607130001_lgpd_consent_log         202607170005_market_quote_cache
202607150001_security_hardening       202607170006_market_cache_read_only
202607160001_goals_and_events         20260717204221_postgres_rls_performance_hardening
202607160002_card_bank_and_benefit_operator  20260717204225_persist_vehicle_usage_entries
202607170001_benefit_cards            20260722000001_custom_plans
202607170002_goal_rpc_security        20260724000001_joint_account
                                      20260724000002_push_notifications
```

Fluxo de migrations e advisors de segurança em [maintenance.md](maintenance.md).
