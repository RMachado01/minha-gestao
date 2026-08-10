# minha-gestão

PWA de **gestão financeira pessoal, familiar e de trabalho** (motorista de app),
em português do Brasil. Frontend **Next.js 16 + React 19 + Tailwind 4**; backend
**Supabase (Postgres + Auth + RLS)**. Deploy na Vercel.

[Acessar a aplicação](https://minha-gestao-pearl.vercel.app)

## Principais entregas

- controle de contas pessoais e compartilhadas, cartões, recorrências e parcelamentos;
- planejamento financeiro, metas, investimentos e calendário de lançamentos;
- modo motorista com ganhos, trajetos, custo real por quilômetro e manutenção veicular;
- experiência PWA com leitura offline, notificações e interface responsiva;
- autenticação e isolamento dos dados com Supabase Auth e Row Level Security;
- assistente financeiro com IA, testes unitários e testes de ponta a ponta.

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

- [Arquitetura](docs/architecture.md) - stack, pastas, fluxo de dados, PWA/offline e autenticação
- [Modelo de dados](docs/data-model.md) - tabelas, RLS, funções, views e migrations
- [Funcionalidades](docs/features.md) - cada feature e suas regras
- [API e integrações](docs/api-and-integrations.md) - rotas `/api/*`, Groq, Web Push e Logo.dev
- [Ambiente](docs/environment.md) - variáveis, setup e deploy
- [Manutenção](docs/maintenance.md) - migrations, cron, testes, LGPD e evolução de features

> **Atenção:** este projeto usa uma versão **customizada** do Next.js. Leia
> `frontend/AGENTS.md` antes de mexer em APIs do framework.
