# Guia de Deploy — Supabase + Vercel

---

## Parte 1: Criar o projeto no Supabase

### 1.1 Criar conta e projeto

1. Acesse [supabase.com](https://supabase.com) e crie uma conta (login com GitHub é mais rápido).
2. Clique em **New Project**.
3. Preencha:
   - **Name**: `minha-gestao`
   - **Database Password**: gere uma senha forte e guarde em local seguro (gerenciador de senhas). Você vai precisar dela para o backend.
   - **Region**: `South America (São Paulo)` — menor latência para usuários no Brasil.
   - **Plan**: Free (suficiente para MVP).
4. Aguarde ~2 minutos até o projeto estar pronto.

### 1.2 Copiar as credenciais

No painel do projeto, vá em **Settings > API**:

| Campo | Onde usar |
|-------|-----------|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` (frontend) e `SUPABASE_URL` (backend) |
| **anon public key** | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (frontend) |
| **JWT Secret** | `SUPABASE_JWT_SECRET` (backend — usado para validar tokens) |

No painel **Settings > Database**, copie a **Connection string (URI)** no formato:
```
postgresql://postgres.[ref]:[senha]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```
Substitua `[senha]` pela senha que criou. Esse é o `DATABASE_URL` do backend (troque `postgresql://` por `postgresql+asyncpg://` para SQLAlchemy async).

### 1.3 Aplicar as migrations

**Opção A — SQL Editor (mais simples):**

1. No painel Supabase, vá em **SQL Editor**.
2. Execute, em consultas separadas e nesta ordem, o conteúdo completo de:
   1. `supabase/migrations/202607120001_initial_schema.sql`
   2. `supabase/migrations/202607120002_complete_schema.sql`
   3. `supabase/migrations/202607130001_lgpd_consent_log.sql`
   4. `supabase/migrations/202607150001_security_hardening.sql`
   5. `supabase/migrations/202607160001_goals_and_events.sql`
   6. `supabase/migrations/202607160002_card_bank_and_benefit_operator.sql`
   7. `supabase/migrations/202607170001_benefit_cards.sql`
   8. `supabase/migrations/202607170002_goal_rpc_security.sql`
   9. `supabase/migrations/202607170003_investment_income.sql`
   10. `supabase/migrations/202607170004_recurring_income_and_goal_transactions.sql`
   11. `supabase/migrations/202607170005_market_quote_cache.sql`
   12. `supabase/migrations/202607170006_market_cache_read_only.sql`
   13. `supabase/migrations/20260717204221_postgres_rls_performance_hardening.sql`
   14. `supabase/migrations/20260717204225_persist_vehicle_usage_entries.sql`

As migrations 6–8 completam cartões de crédito/alimentação e RPCs atômicas. As migrations 13–14 otimizam RLS/índices e separam uso pessoal da Garagem dos registros Uber. Aplique todas antes de publicar o frontend; sem a última, Garagem e diário Uber recusam o salvamento com mensagem orientativa.
3. Não cole apenas o caminho do arquivo: o SQL Editor precisa receber o conteúdo SQL.
4. Verifique em **Table Editor** que as tabelas foram criadas (`profiles`, `transactions`, `credit_cards`, `vehicles`, `uber_daily_entries`, `categories`, `recurrence_rules`, `investments`, `financial_goals`, `goal_events`, etc.).
5. Em **Database > Security Advisor**, confirme que não existem alertas `Security Definer View` para as views `vw_*`.
6. O aviso de `delete_own_account()` como `SECURITY DEFINER` é intencional: a RPC valida `auth.uid()`, usa `search_path` vazio e concede execução somente a `authenticated`.

**Opção B — Supabase CLI (para quem prefere terminal):**

```bash
# Instalar o CLI
npm install -g supabase

# Fazer login
supabase login

# Linkar ao projeto (use o ref do seu projeto, visível na URL do dashboard)
supabase link --project-ref SEU_PROJECT_REF

# Aplicar migrations
supabase db push
```

### 1.4 Verificar RLS

Vá em **Authentication > Policies** (ou **Table Editor > cada tabela > RLS**). Confirme que todas as tabelas têm RLS habilitada e políticas tipo `_owner` criadas. Isso garante que **cada usuário só acessa seus próprios dados**.

### 1.5 Configurar autenticação

1. Vá em **Authentication > Providers > Email**.
2. Confirme que **Enable Email Signup** está ativado.
3. **Confirm email** deve estar **ativado** — o usuário receberá um e-mail de confirmação antes de poder logar.
4. Em **Authentication > URL Configuration**:
   - **Site URL**: `http://localhost:3000` (desenvolvimento) — depois trocar para a URL da Vercel em produção.
   - **Redirect URLs**: adicione:
     - `http://localhost:3000/auth/callback`
     - `https://seu-dominio.vercel.app/auth/callback`
     - `https://seu-dominio-customizado.com.br/auth/callback` (se tiver)
5. Em **Authentication > Email Templates**, personalize o template de confirmação se quiser (opcional — o padrão funciona):
   - Subject: `Confirme seu cadastro — Minha Gestão`
   - Body: pode incluir a marca, mas o link `{{ .ConfirmationURL }}` é obrigatório.
6. Em **Authentication > Attack Protection**, ative **Leaked Password Protection** quando o projeto estiver no plano Pro ou superior. Essa opção não é configurável por migration SQL.

### 1.6 Trigger para criar perfil automaticamente

A migration `202607150001_security_hardening.sql` cria o trigger `on_auth_user_created`. Quando um usuário entra em `auth.users`, o perfil correspondente é criado em `public.profiles` com `security definer` e `search_path` restrito. Não é necessário executar um snippet separado.

---

## Parte 2: Configurar o Frontend localmente

### 2.1 Criar `.env.local`

```bash
cd frontend
cp .env.example .env.local
```

Edite `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...sua-chave-anon
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 2.2 Testar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000/cadastro`, crie uma conta e verifique:
- O e-mail de confirmação chega.
- Ao clicar no link, você é redirecionado para `/auth/callback` e depois para `/`.
- Ao fazer login, os dados são isolados (cada conta só vê seus próprios dados).

---

## Parte 3: Configurar o Backend

### 3.1 Criar `.env`

```bash
cd backend
cp .env.example .env
```

Edite `backend/.env`:
```env
APP_ENV=development
DATABASE_URL=postgresql+asyncpg://postgres.[ref]:[senha]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
FRONTEND_ORIGIN=http://localhost:3000
SECRET_KEY=gere-com-openssl-rand-hex-32
SUPABASE_URL=https://SEU-REF.supabase.co
SUPABASE_JWT_SECRET=seu-jwt-secret-do-supabase
```

### 3.2 Rodar localmente

```bash
# Windows PowerShell
.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

Verifique `http://localhost:8000/docs` (OpenAPI) e `http://localhost:8000/api/v1/health`.

---

## Parte 4: Deploy na Vercel

### 4.1 Conectar repositório

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub.
2. Clique **Add New > Project**.
3. Importe o repositório `RMachado01/minha-gestao`.
4. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Next.js (detectado automaticamente)
   - **Build Command**: `npm run build` (padrão)
   - **Output Directory**: `.next` (padrão)

### 4.2 Variáveis de ambiente

Na aba **Settings > Environment Variables**, adicione:

| Variável | Valor | Ambientes |
|----------|-------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://SEU-REF.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOi...` | Production, Preview, Development |
| `NEXT_PUBLIC_API_URL` | URL do backend em produção | Production |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | Site Key pública do hCaptcha (opcional) | Production, Preview |

As cotações de mercado **não** usam variável na Vercel — veja a Parte 7 (job de cotações no GitHub Actions).

### 4.3 Deploy

Clique **Deploy**. A Vercel vai buildar e publicar. Copie a URL gerada (ex: `minha-gestao.vercel.app`).

### 4.4 Atualizar URLs no Supabase

Volte ao Supabase **Authentication > URL Configuration**:
- **Site URL**: `https://minha-gestao.vercel.app` (ou seu domínio customizado)
- **Redirect URLs**: adicione `https://minha-gestao.vercel.app/auth/callback`

### 4.5 Domínio customizado (opcional)

Na Vercel: **Settings > Domains** > adicione seu domínio. Configure o DNS conforme instruções da Vercel (CNAME ou A record).

---

## Parte 5: Deploy do Backend

O backend FastAPI pode ser hospedado em:

| Plataforma | Prós | Contras |
|------------|------|---------|
| **Railway** | Deploy fácil via GitHub, boa para Python | Plano free limitado |
| **Render** | Free tier com 750h/mês, deploy automático | Spin-down após inatividade no free |
| **Fly.io** | Boa performance, região São Paulo | Configuração via CLI |

**Exemplo com Render:**

1. Acesse [render.com](https://render.com), conecte o GitHub.
2. New > Web Service > selecione o repo.
3. Configure:
   - **Root Directory**: `backend`
   - **Runtime**: Python
   - **Build Command**: `pip install -e ".[dev]"`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Adicione as variáveis de ambiente (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `SECRET_KEY`, `FRONTEND_ORIGIN`).
5. Em `FRONTEND_ORIGIN`, coloque a URL da Vercel (para CORS).

Após o deploy, copie a URL do backend e atualize `NEXT_PUBLIC_API_URL` na Vercel.

---

## Parte 6: Checklist final

- [ ] Migrations aplicadas no Supabase (tabelas + RLS + trigger de perfil)
- [ ] Módulo de metas validado com criação, aporte, retirada e leitura isolada entre duas contas
- [ ] Email confirmation ativado em Auth > Providers > Email
- [ ] Redirect URLs configuradas no Supabase para localhost + produção
- [ ] `.env.local` do frontend preenchido
- [ ] `.env` do backend preenchido
- [ ] Frontend rodando localmente e comunicando com Supabase
- [ ] Backend rodando localmente com `/api/v1/health` respondendo
- [ ] Cadastro + confirmação por email funcionando
- [ ] Login + logout funcionando
- [ ] Dados isolados por usuário (testar com 2 contas)
- [ ] Deploy do frontend na Vercel
- [ ] Deploy do backend (Railway/Render/Fly.io)
- [ ] Site URL e Redirect URLs atualizados no Supabase para produção
- [ ] `NEXT_PUBLIC_API_URL` apontando para o backend em produção
- [ ] Testar fluxo completo em produção

---

## Isolamento de dados e LGPD

### Como funciona o isolamento

- **Row Level Security (RLS)**: toda tabela tem uma política `_owner` que filtra por `auth.uid()`. Um usuário nunca consegue ler, editar ou deletar dados de outro — mesmo que tente via API direta.
- **Grupo familiar**: familiares compartilham dados apenas dentro do `household` via `household_id`. O dono (`owner`) convida membros; cada membro tem papel (`owner`, `manager`, `member`, `viewer`) que define o que pode fazer. Cada familiar tem login próprio — nunca compartilhar credenciais.
- **Backend**: toda mutação deriva `user_id` do token JWT — nunca confia em um `user_id` enviado pelo cliente.

### Conformidade com LGPD

| Requisito LGPD | Status | Implementação |
|----------------|--------|---------------|
| **Base legal** (Art. 7) | Consentimento no cadastro | Usuário cria conta voluntariamente |
| **Finalidade** (Art. 6) | Gestão financeira pessoal | Dados usados apenas para o serviço contratado |
| **Minimização** (Art. 6) | Apenas dados necessários | Nome, email, dados financeiros — sem CPF, RG ou dados sensíveis desnecessários |
| **Acesso aos dados** (Art. 18) | Usuário vê tudo | Dashboard mostra todos os dados do usuário |
| **Confirmação de email** | Implementado | Supabase Auth envia confirmação; conta só ativa após clique |
| **Isolamento** (Art. 46) | RLS no banco | Impossível acessar dados alheios via consulta direta |
| **Criptografia** (Art. 46) | Supabase/HTTPS | Dados em trânsito via TLS; senhas em hash bcrypt/argon2 no Supabase Auth |
| **Exclusão** (Art. 18) | Implementado | Botão "Excluir minha conta" em Configurações chama a RPC `delete_own_account()` (`security definer`, valida `auth.uid()`, apaga `auth.users` e cascateia por FK) |
| **Portabilidade** (Art. 18) | Implementado | "Exportar meus dados" em Configurações baixa um JSON com todas as tabelas do usuário |
| **Consentimento explícito** | Implementado | Checkbox obrigatório no cadastro ("Li e aceito os Termos de Uso e a Política de Privacidade") |
| **Log de consentimento** | Implementado | Cada aceite grava em `consent_logs` (tipo, versão, user agent, timestamp) |
| **Logs e auditoria** (Art. 50) | Parcial | `created_at`/`updated_at` em todas as tabelas; ainda não há um log de auditoria dedicado para alterações críticas (ex: histórico de edição de um lançamento) |
| **Política de retenção** | Documentada, não automatizada | Ver seção abaixo — a exclusão sob demanda cobre o direito do titular; ainda não há expurgo automático por inatividade |

### Política de retenção de dados

- Enquanto a conta estiver ativa, os dados são mantidos indefinidamente para permitir o uso do produto (histórico financeiro, gráficos de evolução).
- O titular pode solicitar a exclusão a qualquer momento pelo botão "Excluir minha conta" — a remoção é imediata e cascateia por chave estrangeira (nenhuma cópia retida).
- `consent_logs` (registro de aceite dos termos) é mantido mesmo após a exclusão da conta por um período de comprovação legal, já que não referencia dados financeiros e serve como prova de consentimento.
- **Ainda não implementado**: expurgo automático de contas inativas há N anos. Se o produto for a público, definir esse prazo (ex.: 5 anos sem login) e implementar via Supabase Scheduled Function/cron chamando `delete_own_account`-equivalente para contas inativas, com aviso prévio por e-mail.

### O que falta para LGPD completa

1. **Log de auditoria de alterações críticas** — hoje só existe `created_at`/`updated_at`; para trilha de auditoria completa (Art. 50), considerar uma tabela `audit_log` alimentada por trigger nas tabelas financeiras.
2. **Expurgo automático por retenção** — ver seção acima.

Itens 1-4 originais (termos, botão de exclusão, exportação, checkbox de consentimento) já estão implementados — esta seção foi atualizada para refletir o estado real do código.

---

## Segurança — DDoS, força bruta e entrada forçada

O que já está no código (verificado nesta auditoria):
- **Headers de segurança** (`frontend/next.config.ts`): CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **RLS em 100% das tabelas**, políticas `_owner` filtrando por `auth.uid()`, funções `security definer` com `search_path` fixado e checagem explícita de `auth.uid()` antes de qualquer ação sensível (`delete_own_account`, `record_goal_event`, `register_benefit_purchase`).
- **Sem chaves secretas expostas no frontend** (nenhuma `service_role`, nenhuma chave hardcoded — tudo via variável de ambiente).
- **Sem enumeração de usuário**: login e recuperação de senha sempre respondem de forma genérica; cadastro com e-mail já existente mostra a mesma tela de sucesso de um cadastro novo, sem confirmar que a conta já existe.
- **Backend FastAPI**: `SUPABASE_JWT_SECRET`/`SECRET_KEY` agora **bloqueiam a inicialização** se `APP_ENV` não for `development` e o valor ainda for o padrão de desenvolvimento (antes, um deploy sem a variável configurada aceitaria qualquer token assinado com o segredo público do código-fonte — falha crítica corrigida). Rate limit básico (`slowapi`, 100 req/min por IP) adicionado como primeira barreira contra abuso na API.
- **CAPTCHA (hCaptcha) no login, cadastro e recuperação de senha** (`frontend/components/auth/Captcha.tsx`) — widget enviado como `captchaToken` em `signInWithPassword`/`signUp`/`resetPasswordForEmail`. Fica inativo automaticamente se `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` não estiver configurada (não quebra o dev local); veja o passo 3 abaixo para ativar de fato.

O que precisa ser configurado **fora do código** (painéis, não arquivos deste repositório):

1. **Rate limit de autenticação (Supabase)** — Authentication → Rate Limits no painel do projeto. Confirme/aperte os limites de: envio de e-mail (confirmação/recovery), tentativas de login por IP, criação de conta por IP. Esses limites do Supabase são a proteção real contra força bruta de senha e contra flood de e-mails de recuperação — nenhuma proteção client-side substitui isso.
2. **Proteção DDoS na borda (Vercel)** — a Vercel já aplica mitigação de DDoS de rede/infraestrutura por padrão em todos os planos. Em Project Settings → Security, avalie ativar/ajustar o **Attack Challenge Mode** e (se disponível no seu plano) regras de **Firewall**/rate limit por rota para as páginas de autenticação (`/login`, `/cadastro`, `/redefinir-senha`).
3. **Ativar o CAPTCHA de fato** — o widget já está implementado no frontend (item acima), mas precisa das duas metades da chave: (a) crie um site em https://dashboard.hcaptcha.com e cole a **Secret Key** em Supabase Authentication → Attack Protection; (b) cole a **Site Key** (pública) na variável `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` nas Environment Variables do projeto na Vercel e faça redeploy. Sem a variável na Vercel, o Supabase vai exigir captcha mas o widget não aparece — login/cadastro ficam bloqueados para todos, então configure as duas pontas juntas.
4. **Alertas de uso anômalo** — configurar alertas de billing/uso no Supabase e na Vercel para detectar picos incomuns de tráfego (sinal precoce de DDoS ou scraping).

---

## Parte 7: Cotações de mercado (GitHub Actions + brapi.dev)

O radar de dividendos e as cotações da carteira em **Investimentos** são alimentados por um job externo, não pelo carregamento da página. O plano gratuito da brapi.dev só aceita 1 ativo por requisição e limita chamadas simultâneas; buscar tudo na hora que o usuário abre a tela deixava só ~3 ações aparecerem. A solução: um script Python roda de fora, 1 ticker por vez, e grava na tabela `market_quote_cache` do Supabase; o frontend apenas **lê** essa tabela (rápido, sem limite de API).

**Componentes:**
- `scripts/refresh_market_quotes.py` — busca os tickers da watchlist curada + os tickers das posições cadastradas pelos usuários, 1 por vez, e faz upsert em `market_quote_cache`.
- `.github/workflows/refresh-market-quotes.yml` — roda a cada 30 min em horário de pregão (13–21 UTC, seg–sex) e também sob demanda (**Run workflow**).
- Migration `202607170006` deixa a tabela **somente leitura** para o app; a escrita é feita pelo job com a `service_role` key (que ignora RLS).

**Configuração (uma vez):** em GitHub → repositório → **Settings → Secrets and variables → Actions → New repository secret**, adicione:

| Secret | Onde obter |
|--------|-----------|
| `BRAPI_TOKEN` | Token gratuito de https://brapi.dev |
| `SUPABASE_URL` | `https://SEU-REF.supabase.co` (Supabase → Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → **service_role** (chave secreta — nunca coloque no frontend nem no Vercel) |

**Primeira carga:** depois de adicionar os secrets, vá em **Actions → Atualizar cotações (brapi.dev) → Run workflow** para semear o cache imediatamente (senão ele só enche no próximo horário agendado). As cotações aparecem na aba Investimentos assim que o job termina.

> A tabela é upsert por ticker (não cresce indefinidamente); o próprio script remove registros de tickers que deixaram de ser rastreados. Se o volume de cotações crescer muito no futuro, avaliar o plano pago da brapi.dev ou reduzir a frequência do cron.
