# Documentação — minha-gestão

Documentação técnica do **minha-gestão**, um PWA de gestão financeira pessoal,
familiar e de trabalho (motorista de app), em português do Brasil.

> Visão de 1 minuto: app **Next.js 16 (App Router) + React 19 + Tailwind 4** no
> frontend, **Supabase (Postgres + Auth + RLS)** como backend. Todo o acesso a
> dados é feito no cliente via Supabase JS, protegido por Row-Level Security.
> Algumas rotas de servidor (`/api/*`) fazem proxy para serviços externos
> (Groq para IA, Web Push) mantendo chaves fora do navegador. Deploy na Vercel;
> banco e auth no Supabase.

## Índice

| Documento | Conteúdo |
|---|---|
| [architecture.md](architecture.md) | Stack, estrutura de pastas, fluxo de dados, autenticação, PWA/service worker, leitura offline, bloqueio por PIN |
| [data-model.md](data-model.md) | Todas as tabelas, colunas, relações, **políticas RLS**, funções `SECURITY DEFINER`, RPCs, views e migrations |
| [features.md](features.md) | Cada funcionalidade em detalhe (lançamentos, status, cartões/parcelas, recorrentes, metas, investimentos, orçamentos, calendário, conta conjunta, Uber, nota por foto, assistente de IA) |
| [api-and-integrations.md](api-and-integrations.md) | Rotas `/api/*` e integrações externas (Groq, Logo.dev, hCaptcha, Web Push/VAPID, brapi) |
| [environment.md](environment.md) | **Todas** as variáveis de ambiente, setup local e deploy |
| [maintenance.md](maintenance.md) | Migrations, cron, advisors de segurança, testes, LGPD e o passo a passo para adicionar uma feature |

## Convenções deste projeto

- **Idioma:** UI e mensagens sempre em **pt-BR**. Nomes de tabelas/colunas em inglês; rótulos e textos ao usuário em português.
- **Next.js customizado:** este repositório usa uma versão do Next com mudanças que podem divergir do conhecido. Veja o aviso em `frontend/AGENTS.md` — **leia a doc local em `node_modules/next/dist/docs/` antes de mexer em APIs do Next.**
- **Dinheiro:** valores monetários em `numeric(12,2)`; no frontend, formatação via `lib/format.ts` (`formatBRL`).
- **Segurança primeiro:** o banco é a fonte de verdade da autorização (RLS). O frontend nunca deve ser a única barreira de acesso a dados.
