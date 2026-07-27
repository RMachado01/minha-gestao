# Variáveis de ambiente, setup e deploy

O arquivo de referência é `frontend/.env.example`. Abaixo, **todas** as
variáveis, onde vão e se são secretas.

## Variáveis

### Obrigatórias (app não sobe sem elas)

| Variável | Escopo | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | público | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | público | Chave anon/publishable (Supabase > Settings > API) |

### Opcionais / por funcionalidade

| Variável | Secreta? | Necessária para |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | não | URL do backend FastAPI (se usado; local `http://localhost:8000`) |
| `MAINTENANCE_MODE` | não (server) | `true` → tudo redireciona para `/manutencao`. Exige redeploy para mudar |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | não | Captcha em login/cadastro (a secret fica no Supabase) |
| `NEXT_PUBLIC_LOGO_DEV_TOKEN` | não (publicável) | Logos de marca (Logo.dev) |
| `NEXT_PUBLIC_LOGO_BASE` | não | Provedor alternativo de logo (`{domain}/{size}`) |
| `GROQ_API_KEY` | **sim** | Assistente de IA e nota por foto |
| `GROQ_MODEL` | não | Modelo de texto (padrão `llama-3.3-70b-versatile`) |
| `GROQ_VISION_MODEL` | não | Modelo de visão (padrão `llama-3.2-11b-vision-preview`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | não (público) | Push — inscrição no cliente |
| `VAPID_PUBLIC_KEY` | não | Push — envio no servidor |
| `VAPID_PRIVATE_KEY` | **sim** | Push — assinatura VAPID |
| `VAPID_SUBJECT` | não | `mailto:` do responsável (VAPID) |
| `CRON_SECRET` | **sim** | Protege `/api/push/cron` (a Vercel injeta no header) |
| `SUPABASE_SERVICE_ROLE_KEY` | **sim** | Cron de push ler dados de todos os usuários. **Nunca** expor ao cliente |

> **Regra de ouro:** nada que seja secreto pode ter prefixo `NEXT_PUBLIC_` — esse
> prefixo injeta o valor no bundle do navegador.

### Secrets fora da Vercel (GitHub Actions — cotações)

| Secret | Uso |
|---|---|
| `BRAPI_TOKEN` | Buscar cotações na brapi.dev |
| `SUPABASE_SERVICE_ROLE_KEY` | Gravar em `market_quote_cache` |

## Setup local

```bash
cd frontend
cp .env.example .env.local      # preencha ao menos as duas obrigatórias
npm install
npm run dev                     # http://localhost:3000
```

O **service worker** só é registrado em produção (`RegisterSW`), então push e
casca offline não funcionam em `npm run dev` — teste-os num deploy de preview.

Banco: aplique as migrations no seu projeto Supabase (ver
[maintenance.md](maintenance.md)).

## Scripts (`frontend/package.json`)

| Script | O que faz |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Build de produção |
| `npm run start` | Sobe o build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (unitários) |
| `npm run test:e2e` | Playwright |
| `npm run check` | lint + typecheck + test + build (rodar antes de subir) |

## Deploy (Vercel)

- Monorepo: a raiz tem `package.json` com `vercel-build` → `npm --prefix frontend run build`. A Vercel builda a partir da raiz.
- `vercel.json` (raiz) define o cron `/api/push/cron`.
- Configure as variáveis em **Settings > Environment Variables** (marque Production, Preview e Development). Variáveis `NEXT_PUBLIC_*` são lidas em **build time** — se adicionar depois de um deploy, faça **Redeploy**.
- Push no branch `main` dispara deploy de produção automático.

## Empacotamento Play Store (TWA) — pendente

O PWA está pronto (manifest + ícones + SW). Para publicar como app Android,
empacotar via TWA/Bubblewrap e preencher a ficha de Data Safety. Ainda não feito.
