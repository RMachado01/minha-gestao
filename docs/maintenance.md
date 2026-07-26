# Manutenção e operação

## Migrations do banco

- Fonte de verdade do schema: `supabase/migrations/*.sql`, aplicadas em ordem de nome.
- **Nomeação:** prefixo de data/versão + `snake_case` (ex.: `20260724000002_push_notifications.sql`).
- Aplicar em produção (web-only): pelo **SQL Editor** do Supabase (colar o arquivo e rodar) ou via `apply_migration` do Supabase MCP. Com CLI local: `supabase db push`.
- Escreva migrations **idempotentes** quando possível (`if not exists`, `drop policy if exists ... create policy ...`) — permite re-rodar sem quebrar.

### Depois de QUALQUER mudança de RLS/DDL

Rode o **advisor de segurança** (Supabase MCP `get_advisors` tipo `security`, ou
o linter do painel). Procure especialmente por:

- `rls_disabled_in_public` / `policy_exists_rls_disabled` → **erro grave**: tabela sem isolamento.
- `security_definer_function_executable` → esperado para RPCs que o app precisa chamar; **não** esperado para funções de trigger (ex.: `stamp_household` teve o EXECUTE revogado).

Exemplo de verificação de isolamento (o que se espera em cada tabela
compartilhável): RLS `on`, uma policy `_select` (com cláusula de household) e uma
`_modify` (own-only). Ver [features.md](features.md#conta-conjunta).

## Cron

- Definido em `vercel.json`. Hoje: `/api/push/cron` diário (`0 11 * * *` UTC).
- Requer **Vercel Pro** + `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY`.
- Para adicionar outro cron, acrescente uma entrada em `crons[]` e um route handler protegido por segredo.

## Testes

- Unitários (Vitest): `lib/goals.test.ts`, `lib/uberCalc.test.ts`, `lib/import/statement.test.ts`, `lib/format.test.ts`.
- E2E (Playwright): `e2e/auth-responsive.spec.ts`. Chromium já vem instalado no ambiente (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`); **não** rode `playwright install`.
- Antes de subir: `npm run check` (lint + typecheck + test + build).
- **Lacuna conhecida:** cobertura fina. Os cálculos financeiros críticos (fatura, parcelas, saldo, limite comprometido em `useCreditCards`) merecem testes dedicados antes de escalar usuários.

## LGPD / dados do usuário

- Exportar dados e excluir conta (`delete_own_account`) em Configurações.
- `consent_logs` registra consentimentos; operadores e transferência internacional estão na política de privacidade (`app/privacidade`).
- Preencher o e-mail do DPO antes do lançamento público.

## Como adicionar uma feature (receita típica)

1. **Schema (se precisar):** nova migration em `supabase/migrations/` com a tabela e a RLS `_owner` padrão (`user_id = (select auth.uid())`, `to authenticated`). Aplicar e rodar `get_advisors`.
2. **Acesso a dados:** um hook em `lib/supabase/use<Feature>.ts` usando `createClient()`. Se houver agregação pesada, prefira uma **view** (`vw_*`) a recalcular no cliente.
3. **UI:** uma pasta em `app/<rota>/page.tsx` (client component) + componentes em `components/<domínio>/`. Adicione a rota em `lib/nav.ts` se for de menu.
4. **Estado vazio:** use `components/ui/EmptyState.tsx` (suporta `actionHref` ou `actionOnClick`) para orientar o novo usuário.
5. **Segredo/serviço externo:** se precisar de chave secreta ou varrer vários usuários, crie um route handler em `app/api/`. Use `getRequestUserId`/`getRequestClient`; só use `createAdminClient` (service role) em cron/rotas confiáveis.
6. **Verifique:** `npm run check`.

## Gotchas (coisas que já morderam)

- **Next.js customizado:** APIs podem divergir do padrão. Leia `node_modules/next/dist/docs/` antes de mexer em recursos do Next (ver `frontend/AGENTS.md`).
- **`NEXT_PUBLIC_` vaza para o bundle:** nunca prefixe segredos com isso.
- **Service worker só em produção:** push e casca offline não funcionam em `npm run dev`.
- **VAPID pública em duas variáveis:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (client) e `VAPID_PUBLIC_KEY` (server) têm o mesmo valor, de propósito.
- **`status` da transação é cosmético** (não afeta saldo). Não confundir com `credit_card_bills.status`, que é funcional.
- **Regex com diacríticos:** ao normalizar texto (statement/subscriptions), os ranges Unicode (`/[̀-ͯ]/g`) precisam ser escritos com escapes, não com os caracteres combinantes literais.
- **Lint `set-state-in-effect`:** evite `setState` síncrono no corpo de um `useEffect`; o padrão do repo é `useSyncExternalStore` ou deferir com `void Promise.resolve().then(...)`.
- **Conta conjunta:** as RPCs são `SECURITY DEFINER` (rodam fora da RLS). Ao mexer nelas, garanta que cada uma só afeta a household do próprio chamador.

## Roadmap / pendências conhecidas

Prioridade para "produto completo" (não features novas, e sim robustez/distribuição):

1. Monitoramento de erros (Sentry) — hoje não há visibilidade de erros em produção.
2. Testes dos cálculos financeiros.
3. Empacotamento Play Store (TWA) + Data Safety.
4. Push de "orçamento estourado" (falta o marcador de "já avisei").
5. Onboarding: o tour usa `localStorage` (reaparece por dispositivo); migrar para uma flag no perfil se quiser persistência entre aparelhos.
6. Entrada automática de dados: WhatsApp (Meta Business) e Open Finance (via agregador, ex. Pluggy — pago; sugerido como recurso premium).
