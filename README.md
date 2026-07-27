# minha-gestão

PWA de **gestão financeira pessoal, familiar e de trabalho** (motorista de app),
em português do Brasil. Frontend **Next.js 16 + React 19 + Tailwind 4**; backend
**Supabase (Postgres + Auth + RLS)**. Deploy na Vercel.

## Rodando localmente

```bash
cd frontend
cp .env.example .env.local     # preencha NEXT_PUBLIC_SUPABASE_URL e ..._PUBLISHABLE_KEY
npm install
npm run dev                    # http://localhost:3000
```

Aplique as migrations de `supabase/migrations/` no seu projeto Supabase.

Antes de subir mudanças: `npm run check` (lint + typecheck + test + build).

## Documentação

A documentação técnica completa (para manutenção e evolução) está em **[`docs/`](docs/README.md)**:

- [Arquitetura](docs/architecture.md) — stack, pastas, fluxo de dados, PWA/offline, auth
- [Modelo de dados](docs/data-model.md) — tabelas, RLS, funções, views, migrations
- [Funcionalidades](docs/features.md) — cada feature e suas regras
- [API e integrações](docs/api-and-integrations.md) — rotas `/api/*`, Groq, Web Push, Logo.dev…
- [Ambiente](docs/environment.md) — variáveis, setup, deploy
- [Manutenção](docs/maintenance.md) — migrations, cron, testes, LGPD, como adicionar uma feature

> **Atenção:** este projeto usa uma versão **customizada** do Next.js. Leia
> `frontend/AGENTS.md` antes de mexer em APIs do framework.
