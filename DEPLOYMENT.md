# Supabase, Vercel e GitHub

## 1. Supabase

1. Criar um projeto Supabase.
2. Aplicar `supabase/migrations/202607120001_initial_schema.sql` pelo CLI ou SQL Editor.
3. Confirmar que RLS está ativa em todas as tabelas do schema `public`.
4. Copiar `frontend/.env.example` para `frontend/.env.local` e preencher URL/chave publicável.
5. Configurar a URL local e as URLs de Preview/Production da Vercel em Auth > URL Configuration.

## 2. Backend

Configurar `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `DATABASE_URL` e `FRONTEND_ORIGIN`. A API exige Bearer token nas mutações; `/api/v1/health` permanece público.

## 3. Vercel

- Root Directory: `frontend`
- Framework preset: Next.js
- Variáveis: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL`
- Separar valores de Development, Preview e Production.

## 4. GitHub

O repositório local deve usar `main`. Antes do primeiro push, criar um repositório privado, configurar `origin` e revisar `git status` para garantir que nenhum `.env` será enviado.
