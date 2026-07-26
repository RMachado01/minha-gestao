# Arquitetura

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) — **versão customizada**, ver `frontend/AGENTS.md` |
| UI | React 19, Tailwind CSS 4, `motion` (animações), `recharts` (gráficos), `lucide-react` (ícones), `lenis` (smooth scroll) |
| Backend | Supabase — Postgres 17, Auth, Row-Level Security, Storage não utilizado |
| Acesso a dados | `@supabase/supabase-js` + `@supabase/ssr` (cliente no navegador; alguns route handlers no servidor) |
| IA | Groq (API compatível com OpenAI) via route handlers server-side |
| Hospedagem | Vercel (frontend + rotas `/api`), Supabase (banco/auth) |
| PWA | manifest + service worker próprio; empacotável como TWA para a Play Store |

## Estrutura de pastas

```
minha-gestao/
├── package.json            # monorepo raiz; script vercel-build chama o frontend
├── vercel.json             # cron diário (/api/push/cron)
├── docs/                   # esta documentação
├── supabase/
│   └── migrations/         # migrations SQL versionadas (fonte de verdade do schema)
└── frontend/
    ├── AGENTS.md           # aviso: Next.js customizado — ler docs locais
    ├── app/                # rotas (App Router)
    │   ├── page.tsx        # Visão geral (dashboard)
    │   ├── layout.tsx      # layout raiz: fontes, metadata, SW, PIN, offline
    │   ├── <rota>/page.tsx # uma pasta por tela (transacoes, cartoes, metas…)
    │   ├── api/            # route handlers (advisor, receipt, push/*)
    │   └── auth/           # callback de autenticação
    ├── components/         # componentes por domínio (cards, goals, advisor, ui…)
    └── lib/                # lógica: supabase/, offline/, push/, advisor/, format, nav…
```

### Telas (rotas) e agrupamento no menu

Definido em `lib/nav.ts`:

- **Finanças:** Visão Geral (`/`), Transações, Fluxo de Caixa, Gastos, Planejamento, Calendário, Recorrentes, Planos, Cartões
- **Patrimônio:** Investimentos, Sonhos e Metas
- **Trabalho:** Uber, Garagem
- **Conta:** Configurações
- Públicas: `/login`, `/cadastro`, `/redefinir-senha`, `/termos`, `/privacidade`, `/manutencao`

`components/shell/AppShell.tsx` decide se aplica o chrome do app (sidebar,
topbar, nav mobile, tour, assistente) ou renderiza a rota "crua" — as rotas
públicas (`PUBLIC_ROUTES`) não recebem o chrome.

## Fluxo de dados

O padrão dominante é **acesso direto ao Supabase pelo cliente**:

1. Um componente client (`"use client"`) chama um hook em `lib/supabase/use*.ts`.
2. O hook cria o client com `createClient()` (`lib/supabase/client.ts`) e faz
   `select`/`insert`/`update`.
3. A **RLS** no Postgres garante que o usuário só enxerga/edita o que pode.
4. Views (`vw_*`) entregam agregações prontas (fatura mensal, resumo, gastos por
   categoria) para os hooks não recalcularem no cliente.

Rotas de servidor (`app/api/*`) existem **apenas** quando é preciso esconder uma
chave secreta ou varrer dados de vários usuários:

- `/api/advisor` e `/api/receipt` → proxy para o **Groq** (chave server-side).
- `/api/push/*` → inscrição e envio de **Web Push** (chaves VAPID server-side; o
  cron usa a **service role** para ler dados de todos os usuários).

Veja [api-and-integrations.md](api-and-integrations.md).

## Autenticação

- **Supabase Auth** (e-mail/senha). `lib/supabase/client.ts` cria o browser
  client; `lib/supabase/server.ts` e `routeUser.ts`/`routeClient.ts` criam
  clients server-side a partir dos cookies da requisição.
- O trigger `handle_new_user` cria automaticamente um registro em `profiles`
  quando um usuário se cadastra (ver [data-model.md](data-model.md)).
- `middleware`/proxy trata o **modo manutenção** (`MAINTENANCE_MODE=true`
  redireciona tudo para `/manutencao`).
- **hCaptcha** protege login/cadastro quando `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`
  está definido (a secret fica no painel do Supabase, não no código).

## PWA, service worker e offline

Arquivo: `frontend/public/sw.js` (registrado por `components/pwa/RegisterSW.tsx`,
**apenas em produção**).

O service worker é **conservador de propósito** (app financeiro):

- **Estáticos imutáveis** (`/_next/static`, ícones, manifest): cache-first.
- **Navegações:** network-first; a casca HTML das páginas visitadas é guardada
  no cache `mg-pages-v1` (**apenas UI, sem dados do usuário**) e servida quando
  offline. Rotas nunca abertas online caem numa página mínima "sem conexão".
- **Push:** handlers `push` e `notificationclick`.

A **leitura offline dos dados** não é feita pelo SW, e sim por um cache no nível
do `fetch` do Supabase:

- `lib/offline/cachedFetch.ts` embrulha o `fetch` do Supabase (via
  `global.fetch` em `client.ts`). Consultas **GET** ao REST são guardadas no
  IndexedDB (`lib/offline/store.ts`) e devolvidas quando a rede falha.
- O cache é **isolado por conta** (namespace pelo `sub` do JWT) e **limpo no
  logout** (evento `SIGNED_OUT`).
- **Só leitura:** escrever (POST/PATCH/DELETE, RPC) exige conexão. Não há fila
  de escrita offline — decisão deliberada para não arriscar duplicidade/conflito
  num app financeiro.
- `components/pwa/OfflineBanner.tsx` avisa quando o aparelho está offline.

> **Trade-off de privacidade:** a leitura offline grava dados financeiros no
> aparelho (IndexedDB). Fica restrito ao dispositivo, isolado por conta e limpo
> no logout; o bloqueio por PIN continua protegendo a interface.

## Bloqueio por PIN (App Lock)

- `lib/lock.ts`: PIN derivado com **PBKDF2 (120k iterações + salt)**; só o hash
  fica no `localStorage`. O desbloqueio vale por sessão.
- `components/security/AppLock.tsx`: overlay opaco que cobre o app quando
  bloqueado (via `useSyncExternalStore`), com guarda anti-flash pré-hidratação
  (um script inline no `layout.tsx` marca `<html data-locked>` e o CSS esconde
  `#app-root` até desbloquear).
- `components/security/AppLockSettings.tsx`: ativar/alterar/desativar em
  Configurações.

## Personalização e temas

- Tema claro/escuro e cor de destaque: script inline no `layout.tsx` aplica o
  tema salvo antes da hidratação (evita flash). `lib/usePersonalization.ts`
  guarda nome, foto e accent no `localStorage`.
- Modo de trabalho: `lib/useUberMode.ts` alterna entre "Garagem" (veículos
  pessoais) e "Uber" (diário de corridas).
