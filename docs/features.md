# Funcionalidades

Uma seção por funcionalidade, com onde vive no código e as regras que não são
óbvias pelo nome.

## Lançamentos e status

- Tela: `app/lancamentos/page.tsx` (criar) e `app/transacoes/page.tsx` (listar/editar).
- Um lançamento é uma linha em `transactions` (`type` income/expense/benefit).
- **Idempotência:** cada insert leva um `idempotency_key` (UUID) — `unique(user_id, idempotency_key)` impede duplicidade.

### Status (`pending`/`paid`/`received`)

- **Definido automaticamente na criação:** despesa → `pending`; receita → `received`; parcelas → `pending`. O usuário **não** escolhe no cadastro.
- **Editável** só em Transações (dropdown Pendente/Pago/Recebido), exibido como chip colorido.
- ⚠️ **É decorativo:** não afeta saldo, entradas, saídas nem economia (as views e `useFinanceSummary` não filtram por status). Decisão pendente: dar semântica (contas a pagar) ou remover. Não confundir com o status **funcional** da fatura de cartão (`credit_card_bills.status`).

## Cartões de crédito e parcelamento

- Tela: `app/cartoes/page.tsx`; cadastro em `components/cards/CardRegistration.tsx`; dados via `lib/supabase/useCreditCards.ts`.
- **À vista vs parcelado:** ao lançar em crédito, escolhe-se à vista ou parcelado (N vezes). Parcelado:
  - Cria **N transações**, uma por mês, cada uma com `bill_reference` (`YYYY-MM`) deslocado, `installments_total` e `current_installment`.
  - Cria uma `recurrence_rule` do tipo `installment` (aparece em Recorrentes).
  - **Limite reservado:** `useCreditCards` soma as faturas **futuras** (`committed_installments`, via `vw_fatura_cartao_mensal` com `reference_month > mês atual`). A tela de Cartões abate o comprometido do limite disponível; "fatura atual" mostra só o mês corrente. O limite vai sendo liberado conforme as parcelas vencem.
- **Cartões de benefício** (VR/VA/flex): `card_type='benefit'`. Compras descontam saldo via RPC `register_benefit_purchase`. Modos `separate` (VR e VA separados) ou `flex`.

## Recorrentes

- Tela: `app/recorrentes/page.tsx`; dados em `lib/supabase/useRecurrences.ts`.
- Tipos: `subscription` (assinatura), `fixed_bill` (conta fixa), `installment` (parcela).
- Logos de marca (Netflix, Spotify, iFood…) são detectados pela descrição em `lib/subscriptions.ts` + `lib/brands.ts` e renderizados por `components/ui/BrandLogo.tsx` (Logo.dev).

## Calendário

- Tela: `app/calendario/page.tsx`.
- Grade mensal com marcadores por dia, coloridos por tipo (receita, despesa, assinatura, parcela, conta fixa). Ao tocar num dia, mostra transações reais + recorrências projetadas.

## Gastos, Fluxo de caixa, Planejamento

- `app/gastos` — gastos por categoria (`vw_gastos_por_categoria_mensal`).
- `app/fluxo-caixa` — evolução de entradas/saídas/saldo (`vw_resumo_mensal`).
- `app/planejamento` — visão consolidada de compromissos.

## Planos (orçamentos + alertas)

- Tela: `app/planos/page.tsx`; dados em `lib/supabase/usePlans.ts`.
- `category_budgets`: teto por categoria; o gasto realizado é derivado das transações.
- `spending_alerts`: avisos por categoria ou total do mês.
- **Pendência conhecida:** o push de "orçamento estourado" ainda não dispara (marcado "em breve"); exige controle de "já avisei" para não repetir todo dia. Ver [api-and-integrations.md](api-and-integrations.md#cron-de-notificações).

## Metas / Sonhos

- Tela: `app/metas/page.tsx`.
- `financial_goals` + `goal_events`. Aportes/retiradas passam pela RPC `record_goal_event` (atualiza `current_amount` com segurança, sem o cliente escrever o saldo direto).
- Projeções por cenário (poupança/CDB/Tesouro/dividendos/custom) calculadas no cliente.

## Investimentos

- Tela: `app/investimentos/page.tsx`; dados em `lib/supabase/useInvestments.ts`.
- `investments` + `investment_snapshots` (valor atual) + `investment_income` (proventos).
- **Cotações:** o frontend NÃO chama a brapi.dev; só lê `market_quote_cache`. Quem alimenta é um job externo (GitHub Actions `scripts/refresh_market_quotes.py`) usando `BRAPI_TOKEN` + `SUPABASE_SERVICE_ROLE_KEY` como secrets do GitHub.

## Uber / Garagem

- `app/uber` — diário de corridas (`uber_daily_entries`); cálculo de lucro em `lib/uberCalc.ts` (tem testes).
- `app/garagem` — veículos (`vehicles`), consumo e custos.
- Alterna via `lib/useUberMode.ts` (Configurações).

## Conta conjunta

- Migration: `20260724000001_joint_account.sql`; hook `lib/supabase/useJointAccount.ts`; UI `components/security/JointAccountSettings.tsx` (em Configurações).
- **Modelo "ver junto, cada um edita o seu":** co-membros de uma household **enxergam** os dados uns dos outros; a **edição continua restrita ao dono** de cada registro.
- Como funciona no banco (8 tabelas compartilháveis: transactions, credit_cards, recurrence_rules, financial_goals, investments, categories, category_budgets, spending_alerts):
  - Cada uma ganhou `household_id` + trigger `stamp_household` (carimba na inserção).
  - RLS dividida: `_select` permite `user_id = auth.uid() OR household_id IN my_household_ids()`; `_modify` (`for all`) só `user_id = auth.uid()`.
- **Fluxo:** `create_household_invite()` gera código (8 chars, expira 7 dias) e faz backfill dos dados existentes; `join_household_by_code(code)` entra e faz backfill; `leave_household()` sai e descarimba. As RPCs são `SECURITY DEFINER` (rodam fora da RLS), mas cada uma só mexe na household do próprio chamador.
- **Não compartilhado:** `vehicles` e `uber_daily_entries` (ferramentas pessoais de trabalho; sem `household_id`).
- Validação: rodar `get_advisors` (security) após qualquer mudança de RLS.

## Nota fiscal por foto

- Rota: `app/api/receipt/route.ts`; UI `components/receipts/`.
- Tira/escolhe foto → reduz no aparelho (canvas) → o servidor extrai valor, data, descrição e categoria com o **modelo de visão do Groq** → formulário editável antes de salvar. A imagem **não é armazenada** (rejeita > 3 MB).

## Assistente de IA (Inteligência da conta)

- UI: `components/advisor/FinancialAdvisorWidget.tsx` (botão flutuante — a patinha de coelho `BunnyPaw`) e `DailyBriefing.tsx`.
- Rota: `app/api/advisor/route.ts` (proxy Groq). Helper `lib/advisor/askAI.ts` monta um **resumo compacto da conta** como contexto (agregados do mês, nunca a lista bruta de transações).
- **Fallback:** se `GROQ_API_KEY` não estiver configurada ou a IA falhar, cai no modo baseado em regras (`lib/goals.ts`).
- Identidade: mascote **coelho** (line art) — `components/ui/BunnyMark.tsx` (sidebar/login) e `BunnyPaw.tsx` (ícone da inteligência).

## Notificações push

Ver [api-and-integrations.md](api-and-integrations.md#web-push).

## Import de extrato (OFX/CSV)

- `lib/import/statement.ts` (com testes) + `components/import/`.
- Faz parse de OFX/CSV e transforma em lançamentos para revisão antes de salvar.

## LGPD

- Exportar dados (JSON) e excluir conta (`delete_own_account`) em Configurações.
- Política de privacidade (`app/privacidade`) lista operadores (Vercel, Supabase, Groq, Logo.dev, hCaptcha) e a transferência internacional (Groq nos EUA).
- `consent_logs` registra consentimentos.
