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
   6. `supabase/migrations/202607170001_benefit_cards.sql`
   7. `supabase/migrations/202607170002_goal_rpc_security.sql`

A migration 6 separa cartões de crédito e alimentação, cria saldos VR/VA ou flexível e registra compras com débito atômico. Aplique-a antes de publicar este frontend; sem ela, cadastro e compra em cartão alimentação serão recusados com mensagem orientativa.
3. Não cole apenas o caminho do arquivo: o SQL Editor precisa receber o conteúdo SQL.
4. Verifique em **Table Editor** que as tabelas foram criadas (`profiles`, `transactions`, `credit_cards`, `vehicles`, `uber_daily_entries`, `categories`, `recurrence_rules`, `investments`, `financial_goals`, `goal_events`, etc.).
5. Em **Database > Security Advisor**, confirme que não existem alertas `Security Definer View` para as views `vw_*`.

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
| **Exclusão** (Art. 18) | A implementar | Adicionar botão "Excluir minha conta" que apaga `auth.users` (cascade deleta tudo) |
| **Portabilidade** (Art. 18) | A implementar | Adicionar exportação de dados em JSON/CSV |
| **Logs e auditoria** (Art. 50) | Parcial | `created_at`/`updated_at` em tabelas; expandir com log de auditoria para alterações críticas |

### O que falta para LGPD completa

1. **Termos de uso e política de privacidade** — exibir no cadastro com checkbox de aceite obrigatório. Deve descrever quais dados são coletados, finalidade, prazo de retenção e como solicitar exclusão.

2. **Botão "Excluir minha conta"** — em Configuracoes, deve chamar `supabase.auth.admin.deleteUser(id)` (ou endpoint backend dedicado) que remove `auth.users`, cascateando a exclusão de todos os dados via foreign keys.

3. **Exportação de dados** — endpoint que retorna todos os dados do usuário em JSON ou CSV (direito de portabilidade, Art. 18).

4. **Consentimento explícito** — checkbox no formulário de cadastro: "Li e aceito os Termos de Uso e Política de Privacidade".

5. **Log de consentimento** — registrar data/hora/IP do aceite dos termos.

6. **Política de retenção** — definir prazo (ex: dados mantidos por 5 anos após última atividade; após esse prazo, exclusão automática ou notificação).

Os itens 1-4 são os mais urgentes antes de colocar em produção com usuários reais.
