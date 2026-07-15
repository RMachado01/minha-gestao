# CLAUDE.md — Sistema de Gestão Financeira Pessoal

> Este arquivo é o contexto de referência para desenvolvimento assistido por IA (Claude Code) do projeto. Ele define escopo, stack, modelagem de dados e regras de negócio. Deve ser mantido atualizado conforme o projeto evolui.

---

## 1. Visão Geral

Sistema web de gestão financeira pessoal, com foco em:
- Controle de entradas e saídas (fixas e variáveis)
- Gastos recorrentes (assinaturas, parcelas, contas mensais)
- Acompanhamento de investimentos
- Controle de múltiplos cartões de crédito (mínimo 3)
- Módulo específico para motorista de app (Uber): lucro bruto, custos (gasolina etc.) e lucro líquido, com KPIs de tendência

Usuário único (ou multiusuário simples) — não é um SaaS multi-tenant complexo neste primeiro momento, mas a modelagem deve deixar a porta aberta para isso (todo dado pendurado em `user_id`).

### 1.1 Estado atual do projeto — 12/07/2026

O projeto deixou de ser apenas uma especificação e já possui uma fundação executável:

- **Frontend:** Next.js 16.2.10, React 19, Tailwind CSS 4 e Recharts, com dashboards navegáveis e dados mockados.
- **Backend:** FastAPI com schemas Pydantic, modelos SQLAlchemy assíncronos e rotas versionadas em `/api/v1`.
- **Banco e autenticação:** migração inicial do Supabase/Postgres com RLS; clientes SSR/browser e proxy de sessão preparados no frontend.
- **Versionamento:** repositório privado [RMachado01/minha-gestao](https://github.com/RMachado01/minha-gestao), branch `main`.
- **Execução local:** frontend em `http://localhost:3000`; API em `http://localhost:8000`; OpenAPI em `/docs`.
- **Limite atual:** formulários ainda usam estado local/mock. Persistência real será ativada após criar o projeto Supabase e configurar as variáveis de ambiente.

---

## 2. Stack Técnica

### 2.1 Confirmação e sugestões sobre a stack proposta

A ideia original (TypeScript + FastAPI + PostgreSQL) é sólida. Ajustes recomendados:

| Camada | Proposta original | Recomendação | Motivo |
|---|---|---|---|
| Backend | Python / FastAPI | ✅ Mantido | Rápido, tipado com Pydantic, ótimo para APIs financeiras com validação forte |
| Banco | PostgreSQL | ✅ Mantido | Transacional, suporta bem valores monetários (`NUMERIC`), datas, JSON quando precisar |
| Frontend | TypeScript | **Next.js (versão estável atual, App Router) + React** | Evita congelar uma major antiga; usa Server Components, streaming e roteamento moderno |
| ORM | — | **SQLAlchemy 2.0 (async) + Alembic** | Migrations versionadas, essencial em sistema financeiro |
| Validação | — | **Pydantic v2** | Já nativo do FastAPI |
| UI Kit | — | **Tailwind CSS + shadcn/ui (Radix)** | Base acessível e customizável; os componentes pertencem ao projeto e não viram uma dependência opaca |
| Gráficos/KPI | — | **Recharts** (ou Tremor, feito para dashboards financeiros) | Boa curva de aprendizado, encaixa com React |
| Data fetching | — | **Server Components por padrão + TanStack Query onde houver interação/cache no cliente** | Evita JavaScript e estado duplicado sem perder boa UX em tabelas e mutações |
| Estado global | — | **URL + estado local primeiro; Zustand somente com caso de uso comprovado** | Filtros compartilháveis ficam na URL; evita store global prematura |
| Formulários | — | **React Hook Form + Zod** | Validação tipada, mensagens consistentes e integração com componentes acessíveis |
| Autenticação | — | **Supabase Auth + `@supabase/ssr`**, sessão em cookies e validação do Bearer token no FastAPI | Integra Next.js SSR, Postgres/RLS e futuro acesso familiar sem armazenar senhas na aplicação |
| Jobs agendados | — | **APScheduler** (simples) ou **Celery + Redis** (se crescer) | Necessário para gerar lançamentos recorrentes automaticamente todo mês |
| Cache/fila | — | **Redis** (opcional no MVP) | Útil para KPIs pesados e jobs |
| Containerização | — | **Docker + docker-compose** (backend, frontend, db, redis) | Ambiente reprodutível |
| Deploy | — | **Frontend: Vercel; banco/auth: Supabase; backend: definir entre Vercel Functions, Railway ou Render** | Decisão alinhada ao estado atual; backend continua separado até medir limites de execução |
| Testes | — | `pytest` + `httpx` (backend), `Vitest`/`Playwright` (frontend) | Crítico em sistema financeiro — cobrir cálculo de saldo, recorrência e KPIs |

### 2.2 Monorepo atual

```
/backend        -> FastAPI (Python)
  /app
    /models     -> SQLAlchemy models
    /schemas    -> Pydantic schemas
    /routers    -> endpoints por domínio
    /services   -> regras de negócio (cálculo de saldo, recorrência, KPI)
    /jobs       -> geração automática de lançamentos recorrentes
  /alembic
/frontend       -> Next.js + TypeScript
  /src
    /app             -> rotas, layouts, loading/error boundaries
    /features        -> módulos de negócio autocontidos
    /components/ui   -> primitives do design system
    /lib             -> API client, formatos, utilitários compartilhados
    /styles          -> tokens e estilos globais
docker-compose.yml
/supabase
  /migrations   -> schema SQL, constraints, índices e políticas RLS
/docs           -> especificações e decisões de produto
DEPLOYMENT.md   -> checklist de Supabase, Vercel e GitHub
```

> Ainda não existe `docker-compose.yml`; ele permanece como melhoria futura. O repositório raiz é o único repositório Git — não criar `.git` dentro de `frontend` ou `backend`.

### 2.3 Princípios de arquitetura do frontend

- **Server Components por padrão.** Adicionar `"use client"` somente na menor fronteira que realmente usa eventos, estado ou APIs do navegador.
- **Organização por feature**, não por tipo técnico global: `features/transactions`, `features/cards`, `features/investments`, `features/uber`.
- **Fonte única de verdade:** dados remotos pertencem ao servidor/TanStack Query; filtros navegáveis pertencem à URL; estado efêmero pertence ao componente.
- **Contratos gerados:** FastAPI publica OpenAPI e o frontend gera tipos/client (ex.: `openapi-typescript`). Não duplicar DTOs manualmente.
- **Validação nas duas pontas:** Zod melhora a UX, mas o backend continua sendo a autoridade. Exibir erros de campo retornados pela API.
- **Dinheiro no frontend:** API envia valores monetários como string decimal (`"1234.56"`); nunca calcular dinheiro com `number`/ponto flutuante. Usar biblioteca decimal quando houver cálculo no cliente e `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` apenas para apresentação.
- **Datas:** API usa ISO 8601; datas civis (`YYYY-MM-DD`) não devem sofrer conversão implícita de fuso. Instantes usam UTC com offset e são exibidos em `America/Sao_Paulo`.
- **Renderização previsível:** toda rota de dados deve possuir `loading.tsx`, `error.tsx` e estado vazio específico; erros globais usam `global-error.tsx`.
- **Sem abstração prematura:** componente compartilhado só nasce após uso real em mais de um módulo ou quando faz parte do design system.

### 2.4 Qualidade e automação

- TypeScript em modo `strict`; proibir `any` implícito e imports circulares.
- ESLint + Prettier; hooks de pre-commit somente para verificações rápidas.
- CI mínima: lint, typecheck, testes, build de produção e migrations em modo de validação.
- Dependências com versão fixada por lockfile e atualizações automatizadas, revisadas em lotes pequenos.
- Observabilidade: logs estruturados com `request_id`, captura de erros no frontend/backend e métricas de latência/erro sem registrar dados financeiros sensíveis.

---

## 3. Modelagem de Domínio

### 3.1 Entidades principais

**User**
- id, nome, email, senha_hash, created_at

> Com Supabase Auth, a credencial pertence a `auth.users`. Dados editáveis da pessoa ficam em `public.profiles`; a aplicação não cria nem persiste `senha_hash` diretamente.

**Profile**
- id (FK para `auth.users`), nome_completo, telefone, estado, moeda

**Household / HouseholdMember** (gestão familiar futura)
- `Household`: id, nome, owner_id, created_at
- `HouseholdMember`: household_id, user_id, papel (`owner` | `manager` | `member` | `viewer`), status
- Cada familiar terá login próprio; nunca compartilhar credenciais.

**Category** (categorias, separadas por tipo)
- id, user_id, nome, tipo (`income` | `expense`), cor, ícone

**Transaction** (lançamento financeiro genérico — entradas e saídas)
- id, user_id, tipo (`income` | `expense`)
- valor, data, descrição, category_id
- origem: `fixed_income` | `variable_income` | `expense` | `recurring_expense`
- is_recurring (bool)
- recurrence_id (FK opcional para `RecurrenceRule`)
- account_id (opcional — se houver múltiplas contas bancárias)
- status: `pending` | `paid` | `received`
- payment_method: `pix` | `credit` | `cash` | `benefit`
- credit_card_id (obrigatório quando `payment_method=credit`)
- benefit_kind: `vr` | `va` | `flex` (quando `tipo=benefit`)
- idempotency_key

> Regra: lançamentos de VR/VA usam categoria `Alimentação` automaticamente. Compras no crédito sempre referenciam um cartão cadastrado.

**RecurrenceRule** (para assinaturas, parcelas e contas fixas)
- id, user_id, descrição
- tipo: `subscription` (recorrente indefinido) | `installment` (parcelado com fim) | `fixed_bill` (conta mensal, ex: aluguel, luz)
- valor, dia_do_mes
- data_inicio, data_fim (nulo se indefinido)
- total_parcelas, parcela_atual (se `installment`)
- ativo (bool)
- category_id

> Regra de negócio: um job mensal gera automaticamente as `Transaction` a partir das `RecurrenceRule` ativas, incrementando `parcela_atual` e desativando quando `parcela_atual == total_parcelas`.

**Income** — modelado como `Transaction` com `tipo=income`, diferenciando:
- `fixed_income` (salário, ex: valor estável todo mês)
- `variable_income` (freelas, bônus, etc.)

### 3.2 Investimentos

**Investment**
- id, user_id, nome, tipo (`renda_fixa` | `renda_variavel` | `fundo` | `cripto` | `outro`)
- valor_investido, data_aplicacao, instituição

**InvestmentSnapshot** (histórico de valor para acompanhar evolução)
- id, investment_id, data, valor_atual

> Permite montar gráfico de evolução patrimonial e rentabilidade (valor_atual - valor_investido) / valor_investido.

### 3.3 Cartões de Crédito

**CreditCard**
- id, user_id, apelido, bandeira, limite_total
- dia_fechamento, dia_vencimento, ativo

**CreditCardTransaction**
- id, credit_card_id, descrição, valor, data_compra
- parcelas_total, parcela_atual (se compra parcelada)
- category_id
- fatura_referencia (mês/ano da fatura em que entra)

**CreditCardBill** (fatura consolidada, calculada ou materializada)
- id, credit_card_id, mês_referencia, valor_total, status (`aberta` | `fechada` | `paga`)

> Regra: o sistema deve permitir cadastrar no mínimo 3 cartões e exibir, por cartão: limite usado, limite disponível, valor da fatura atual e próximo vencimento.

### 3.4 Módulo Uber (motorista de app)

**UberEntry** (lançamento diário ou por período)
- id, user_id, data
- receita_bruta (corridas)
- custo_combustivel
- outros_custos (manutenção, pedágio, app fees etc. — pode ser lista de itens)
- lucro_liquido (**calculado**: receita_bruta - custo_combustivel - outros_custos)
- km_rodados (opcional, para calcular custo por km)
- vehicle_id, unidades_consumidas (kWh ou litros), preço_unitário, horas_trabalhadas

**Vehicle**
- id, user_id, marca, modelo, ano, estado, ativo
- motorização: `combustion` | `hybrid` | `electric`
- eficiência: elétrico em `kWh/100 km`; combustão/híbrido em `km/l`
- preço_unitário: `R$/kWh` ou `R$/litro`

> Cálculo automático: elétrico usa `(km × kWh_por_100km / 100) × tarifa`; combustão/híbrido usa `(km / km_por_litro) × preço_litro`. O backend recalcula e valida o valor enviado pelo frontend.

**Cálculos derivados / KPIs do módulo Uber**
- Lucro líquido do período (dia/semana/mês)
- Margem líquida (%) = lucro_liquido / receita_bruta
- Custo de combustível como % da receita (indicador de "alta" ou "queda" de custo)
- Tendência: comparação do período atual vs. período anterior (ex: média móvel de 7 ou 30 dias) para indicar seta de alta/queda
- KPI sugerido: `variação_percentual = (média_atual - média_anterior) / média_anterior`
  - se > 0 → tendência de alta na margem/lucro (bom)
  - se < 0 → tendência de queda (alerta)
  - destacar separadamente a tendência do **custo de gasolina** (se subir muito, alertar mesmo que o lucro bruto esteja estável)

---

## 4. Funcionalidades por Módulo (MVP)

### 4.1 Dashboard geral
- Saldo do mês (entradas - saídas)
- Resumo de renda fixa vs. variável
- Próximos gastos recorrentes (assinaturas/parcelas/contas)
- Alertas de vencimento de fatura de cartão

### 4.2 Entradas e Saídas
- CRUD de transações com categorização
- Filtro por tipo (fixo/variável, recorrente/único)
- Marcar gasto como recorrente mensal ao cadastrar (vira uma `RecurrenceRule`)

### 4.3 Investimentos
- CRUD de investimentos
- Histórico de valor (snapshot manual ou importado)
- Gráfico de evolução e rentabilidade

### 4.4 Cartões de Crédito
- CRUD de cartões (mín. 3)
- Lançamento de compras (à vista ou parcelada)
- Visão de fatura atual por cartão
- Visão consolidada (soma de todas as faturas em aberto)

### 4.5 Uber / Motorista de App
- Lançamento diário de receita bruta e custos
- Cálculo automático de lucro líquido
- KPIs de tendência (alta/queda) de lucro e de custo de combustível
- Gráfico de evolução (linha) receita vs. custo vs. lucro

---

## 5. Regras de Negócio Importantes

1. Todo valor monetário deve ser armazenado como `NUMERIC(12,2)` no Postgres — nunca `float`.
2. Datas de recorrência: gerar lançamentos futuros via job, não calcular "on the fly" no front — facilita histórico e edição pontual (ex: pular um mês de uma assinatura).
3. Parcelamentos (cartão e gastos gerais) devem guardar `parcela_atual/total_parcelas` para exibir progresso.
4. KPIs de tendência devem sempre comparar períodos equivalentes (semana vs. semana anterior, mês vs. mês anterior) para não distorcer a leitura.
5. Nenhum dado sensível (senha) em texto puro — hash com `argon2` ou `bcrypt`.
6. Toda criação financeira deve aceitar `idempotency_key` para impedir duplicidade por retry/duplo clique.
7. Registros financeiros relevantes não devem ser apagados fisicamente sem política explícita; usar cancelamento/estorno ou soft delete com trilha de auditoria.
8. Alterações críticas registram `created_at`, `updated_at`, autor e versão. Concorrência deve ser detectada para evitar que uma aba sobrescreva outra silenciosamente.
9. O backend sempre deriva `user_id` da sessão; nunca confiar em um `user_id` recebido do cliente.

### 5.1 Convenções da API

- Prefixo versionado: `/api/v1`.
- Erros seguem um envelope estável, inspirado em Problem Details: `{ type, title, status, detail, code, field_errors, request_id }`.
- Listagens usam paginação por cursor quando houver crescimento; filtros e ordenação são documentados no OpenAPI.
- Valores monetários trafegam como strings decimais; datas e instantes seguem as regras da seção 2.3.
- Toda resposta de mutação devolve o recurso canônico salvo pelo servidor.
- Endpoints de escrita aplicam rate limit, idempotência e auditoria conforme o risco.
- CORS usa allowlist explícita. O Next.js mantém a sessão Supabase em cookies SSR; o FastAPI recebe `Authorization: Bearer <access_token>` e deriva o usuário do claim `sub` validado.

**Rotas já estruturadas:**

- `GET /api/v1/health` — pública.
- `POST /api/v1/transactions` — cria lançamento autenticado.
- `POST /api/v1/credit-cards` — cadastra cartão sem armazenar número completo/CVV.
- `POST /api/v1/vehicles` e `POST /api/v1/vehicles/{id}/energy-cost` — veículo e custo energético.
- `POST /api/v1/uber/daily-entries` — diário com consumo e lucro recalculados.
- `PUT /api/v1/profile` — perfil do usuário.
- `POST /api/v1/households/{id}/invites` — convite familiar futuro.

Exceto o health check, mutações exigem token Supabase. As respostas atuais validam contratos, mas ainda precisam ser conectadas às sessões SQLAlchemy/Supabase para persistência.

---

## 6. Visualização Gráfica — Acompanhamento Mensal e Anual

Pesquisa aplicada de boas práticas de dashboards financeiros (2026) para guiar a construção das telas de gráfico. Resumo do que vale a pena trazer pro projeto:

### 6.1 Princípios gerais (evitar "dashboard poluído")
- **Poucos KPIs por tela, bem escolhidos.** Usar 4–8 indicadores ligados a decisões reais como limite de projeto, não como regra científica. Cada card deve responder a uma pergunta específica.
- **Hierarquia visual**: número grande e destacado (ex: saldo do mês, lucro líquido Uber) no topo, seguido de gráfico de tendência logo abaixo — contexto sem poluir a visão principal.
- **Consistência de estilo de gráfico por tipo de dado** — não variar à toa:
  - **Linha** → séries temporais / tendência (saldo ao longo do tempo, evolução de investimento, lucro Uber por dia)
  - **Barra** → comparação entre categorias discretas (gasto por categoria, entradas vs. saídas por mês)
  - **Donut/Pizza** → composição de um todo (percentual de gasto por categoria, alocação de investimentos por tipo)
  - **Tabela** → detalhamento (extrato de transações, faturas de cartão) — sempre ordenável e filtrável
  - Nenhum gráfico 3D ou decorativo — reduz legibilidade sem ganho de informação.
- **Cor com significado, não decoração**: verde = positivo/entrada/lucro, vermelho = negativo/saída/prejuízo, cor neutra para itens informativos. Mantém-se coerente em todas as telas.
- **Comparação é o que gera insight**: todo KPI de tendência deve comparar períodos equivalentes (mês atual vs. mês anterior, mesmo mês do ano anterior, média móvel) — não números isolados.

### 6.2 Estrutura de telas recomendada (adaptando os "4 blocos" do dashboard financeiro moderno para o escopo pessoal)

1. **Visão Geral (Home)** — número grande de saldo do mês + mini-gráfico de linha (últimos 6–12 meses) + cards de KPI (entradas, saídas, economia %, próximos vencimentos)
2. **Fluxo de Caixa (Entradas x Saídas)** — gráfico de barras combinado (entradas vs. saídas lado a lado, por mês), com toggle mensal/anual
3. **Composição de Gastos** — donut de gastos por categoria (mês selecionado) + ranking em tabela (categoria que mais pesa no orçamento)
4. **Investimentos** — linha de evolução patrimonial (valor investido x valor atual) + donut de alocação por tipo de investimento + indicador de rentabilidade (%)
5. **Cartões de Crédito** — barras de "limite usado x disponível" por cartão + linha do total das faturas mês a mês
6. **Uber** — linha combinada receita bruta / custo combustível / lucro líquido por dia ou semana, com KPI de tendência (seta de alta/queda) comparando períodos

### 6.3 Filtro de período (mensal/anual) — padrão de UX
- Um seletor único no topo da tela (mês/ano, ou toggle "Mensal | Anual"), aplicado a todos os gráficos da página — evita ter que configurar cada gráfico individualmente.
- No modo anual, os gráficos por mês (barras) mostram os 12 meses; no modo mensal, granularidade diária/semanal.
- Guardar o filtro selecionado no estado da URL (query params) pra permitir compartilhar/link direto.

### 6.4 Arquitetura técnica para suportar os gráficos

**Agregação no banco, não no front:**
- Usar `date_trunc('month', data)` / `date_trunc('year', data)` no Postgres pra pré-agregar os dados antes de mandar pro front. Nunca mandar milhares de transações cruas pro gráfico renderizar.
- Criar **views** (ou **materialized views**, se o volume crescer) por domínio:
  - `vw_resumo_mensal` (entradas, saídas, saldo, por mês)
  - `vw_gastos_por_categoria_mensal`
  - `vw_evolucao_investimentos`
  - `vw_fatura_cartao_mensal`
  - `vw_uber_resumo_diario` (receita, custo, lucro, e cálculo de variação % vs. período anterior via `LAG()` window function)
- Endpoints de dashboard (`/dashboard/*`) devem devolver dados já formatados pro gráfico (`{periodo, valor}[]`), sem lógica de agregação no frontend.

**Cálculo de tendência (KPI de alta/queda):**
- Usar window functions do Postgres (`LAG`, `AVG() OVER`) pra calcular variação percentual entre períodos direto na query, evitando reprocessar no backend/front.
- Exemplo de padrão: `variacao = (valor_atual - valor_periodo_anterior) / NULLIF(valor_periodo_anterior, 0)`.

**Bibliotecas de gráfico (frontend):**
- **Recharts** — mais simples, ótima integração com React/Next.js, cobre linha/barra/donut sem complicação.
- **Tremor** pode ser avaliado em um spike curto, mas não deve ser misturado ao design system sem validar acessibilidade, bundle e facilidade de customização.
- Se quiser algo mais robusto/customizável no futuro: **Nivo** ou **D3** direto, mas isso só compensa se o Recharts/Tremor começar a limitar.

**Responsividade:**
- Web é o principal ambiente para análise profunda; no mobile, empilhar cards, priorizar KPIs e permitir rolagem horizontal somente em tabelas que não possam ser condensadas.

### 6.5 Resumo de ajustes a incorporar no schema (seção 3)
- Adicionar índice composto em `Transaction(user_id, data)` e em `UberEntry(user_id, data)` — toda a camada de gráfico depende de range de datas.
- Prever campo `mes_referencia` (formato `YYYY-MM`) já materializado em tabelas de fatura/recorrência, evitando recalcular `date_trunc` toda hora em tabelas grandes.

### 6.6 Design system e experiência de uso

**Direção visual:** interface sóbria, contemporânea e densa na medida certa. Usar superfícies neutras, bordas sutis e uma única cor de marca. Verde e vermelho ficam reservados para semântica financeira; não depender somente da cor para comunicar estado.

**Decisão de materiais:** Liquid Glass fica restrito à camada funcional flutuante — sidebar, topbar, filtro de período, barra mobile, popovers e resumos interativos. Cards, formulários, tabelas e gráficos usam superfícies sólidas `surface-card`; não aplicar blur em toda a camada de conteúdo.

**Tokens obrigatórios:** cores semânticas, tipografia, espaçamento, raios, sombras, larguras de conteúdo e duração de animação em CSS variables. Suportar tema claro/escuro sem duplicar classes por componente. Números financeiros usam algarismos tabulares (`font-variant-numeric: tabular-nums`).

**Layout:**
- Desktop: sidebar agrupada por domínio + cabeçalho compacto com período global e ação principal. Torná-la recolhível permanece melhoria futura.
- Tablet: sidebar compacta ou drawer.
- Mobile: navegação inferior com no máximo cinco destinos principais; ações secundárias vão para menu contextual.
- Conteúdo com largura máxima coerente; grids usam container queries quando o componente precisar funcionar em regiões diferentes.

**Componentes-base:** `Button`, `Input`, `Select`, `DatePicker`, `MoneyInput`, `FormField`, `Card`, `KpiCard`, `DataTable`, `EmptyState`, `Skeleton`, `Alert`, `Dialog`, `Drawer`, `Toast` e primitives de gráficos. Variantes devem ser tipadas; não copiar combinações longas de classes entre telas.

**Estados obrigatórios por fluxo:** carregando (skeleton estável), vazio (com próxima ação), erro recuperável (mensagem + tentar novamente), sem permissão, offline/reconectando, sucesso e estado otimista quando for seguro. Nunca trocar a tela inteira por spinner.

**Formulários financeiros:**
- Labels visíveis; placeholder não substitui label.
- Entrada monetária amigável a `pt-BR`, mas valor canônico decimal no submit.
- Confirmação para exclusões e operações irreversíveis; preferir desfazer em operações reversíveis.
- Evitar duplo envio, preservar os dados após erro e focar o primeiro campo inválido.
- Alterações otimistas somente quando a reversão for clara; pagamentos e lançamentos críticos aguardam confirmação do servidor.

**Tabelas:** paginação e ordenação no servidor, filtros refletidos na URL, cabeçalho fixo quando útil, colunas prioritárias no mobile e menu de ações acessível por teclado. Não renderizar milhares de linhas no DOM.

**Gráficos acessíveis:** título e resumo textual, legenda clara, tooltip navegável quando possível e tabela/resumo equivalente para informação crítica. Paleta distinguível para daltonismo; nunca comunicar séries apenas por vermelho/verde.

### 6.7 Acessibilidade, performance e privacidade

- Meta: **WCAG 2.2 nível AA**. Fluxos completos operáveis por teclado, foco visível e não encoberto, ordem de foco lógica, regiões semânticas e anúncios com `aria-live` para resultados assíncronos importantes.
- Alvos interativos com pelo menos 24×24 CSS px e espaçamento adequado; preferir 44×44 em ações principais no mobile.
- Respeitar `prefers-reduced-motion`; animações devem explicar mudança de estado, não decorar.
- Respeitar `prefers-reduced-transparency`; substituir blur por superfície sólida quando solicitado pelo sistema.
- Contraste AA inclusive em gráficos, placeholders, bordas de campos e estados disabled.
- Orçamento inicial por rota: JavaScript de cliente minimizado, sem dependências pesadas para utilidades simples; medir LCP, INP e CLS em produção.
- Carregar gráficos pesados sob demanda; buscar dados em paralelo e usar Suspense/streaming para evitar waterfalls.
- Conteúdo financeiro não deve ser indexado nem ficar em caches públicos. Mascarar valores em screenshots/telemetria e oferecer modo de privacidade para ocultar saldos.
- CSP, headers de segurança e variáveis secretas apenas no servidor. Toda mutação valida autenticação, autorização e `user_id` no backend.

### 6.8 Testes do frontend

- **Unitários:** formatação/parsing de dinheiro, datas, variação percentual e regras de apresentação.
- **Componentes:** formulários, estados de erro/vazio, navegação por teclado e casos extremos de valores/textos.
- **Integração:** Mock Service Worker para contratos da API sem mockar detalhes internos do React.
- **E2E (Playwright):** login, criar/editar transação, recorrência, compra parcelada, fechamento/pagamento de fatura e lançamento Uber.
- **Acessibilidade:** axe automatizado como barreira básica + revisão manual de teclado e leitor de tela nos fluxos críticos.
- **Visual:** snapshots somente para primitives estáveis; preferir testes de comportamento nas telas.

### 6.9 Direção visual — Vercel/Geist adaptada ao produto

A interface deve se inspirar na clareza do dashboard e do design system Geist da Vercel, sem copiar sua identidade visual. A referência serve para hierarquia, densidade, navegação e comportamento; o produto deve manter marca própria.

**Princípios visuais:**

- Base predominantemente neutra, alto contraste, bordas nítidas e sombras em camadas muito sutis.
- Grade consistente, alinhamentos rigorosos e espaço em branco usado para agrupar conteúdo, não apenas decorar.
- Tipografia **Geist Sans** para interface e **Geist Mono** somente para identificadores ou números que se beneficiem de largura fixa. Valores comparáveis usam `tabular-nums`.
- Raio discreto e concêntrico: o raio do elemento interno nunca supera o do contêiner.
- Uma cor de destaque da marca; verde, âmbar e vermelho permanecem semânticos.
- Interações aumentam contraste em `hover`, `active` e `focus`; evitar animações grandes, glassmorphism excessivo, gradientes decorativos e cards aninhados sem necessidade.
- Skeletons devem reproduzir exatamente a geometria final para evitar layout shift.

**Anatomia padrão de página:**

1. Breadcrumb curto quando houver mais de um nível.
2. Título específico e contexto secundário em uma linha.
3. Ação primária única à direita (`Nova transação`, `Novo lançamento`).
4. Filtros persistentes e busca abaixo do cabeçalho.
5. KPIs essenciais antes da visualização principal.
6. Conteúdo principal em tabela, gráfico ou board.
7. Detalhes abertos em painel lateral, preservando o contexto da página.

Painéis laterais (`Sheet`) servem para inspeção e edição rápida de transações, cartões e lançamentos. Decisões bloqueantes ou destrutivas usam `Dialog`; no mobile, detalhes usam `Drawer`. Ao fechar, o foco retorna ao elemento que abriu o painel.

### 6.10 Navegação simples e previsível

Inspirada no dashboard da Vercel de 2026:

- **Desktop implementado:** sidebar Liquid Glass agrupada em `Finanças`, `Patrimônio`, `Trabalho` e `Conta`.
- **Mobile implementado:** barra inferior flutuante com `Início`, `Fluxo`, ação central `Adicionar`, `Cartões` e `Mais`, respeitando safe areas e alcance com uma mão.
- Exibir primeiro os destinos mais frequentes; módulos avançados não devem competir visualmente com ações diárias.
- Item ativo tem texto, ícone e contraste — nunca somente uma barra colorida.
- Abas são usadas apenas para visões irmãs da mesma entidade, com no máximo 5–7 itens no desktop e 3–4 no mobile. O estado ativo fica na URL.
- Busca/comando global (`Ctrl/Cmd + K`) localiza transações, cartões, categorias e ações. É um acelerador, nunca o único caminho.
- Filtros de período e contexto permanecem visíveis e sincronizados com query params.
- Nenhuma tela termina em beco sem saída: vazio e erro sempre oferecem uma próxima ação ou recuperação.
- Avisar antes de navegar quando houver formulário com alterações não salvas.

**Mapa recomendado:**

```text
Visão geral
Transações
  Todas | Entradas | Saídas | Recorrentes
Planejamento
  Fluxo mensal | Contas a pagar | Kanban
Cartões
  Visão consolidada | Cartão selecionado | Faturas
Investimentos
Uber
Configurações
```

### 6.11 Kanban financeiro

O Kanban é uma visualização opcional de **fluxo de trabalho**, não substitui tabelas, extratos nem gráficos. O melhor uso no produto é acompanhar contas e compromissos:

```text
Previsto  →  Agendado  →  Vence em breve  →  Pago
                              ↓
                           Atrasado
```

**Card compacto:** descrição, valor, vencimento, categoria, recorrência/parcela e indicador textual de risco. O valor recebe maior peso; metadados ficam em uma ou duas linhas. O card inteiro abre detalhes, mas ações internas continuam elementos interativos separados.

**Comportamento:**

- Drag-and-drop no desktop e toque prolongado no mobile podem acelerar a mudança de status, mas nunca são o único método.
- Menu `…` oferece `Mover para…`, editar, duplicar e cancelar. Teclado e leitor de tela conseguem executar as mesmas mudanças.
- Após mover, anunciar o novo status com `aria-live`, atualizar contagens e oferecer `Desfazer` em toast.
- Mudanças com efeito financeiro real, como marcar fatura como paga, exigem confirmação do servidor e não usam atualização otimista irreversível.
- Colunas mostram título, quantidade e total monetário; cabeçalhos permanecem visíveis durante rolagem.
- Limitar informação visível por card e permitir recolher colunas vazias. Em telas pequenas, mostrar uma coluna por vez com seletor de status; não comprimir quatro colunas ilegíveis.
- Filtros, ordenação e estado do board ficam na URL. A mesma informação deve continuar disponível em tabela.

**Estados visuais:** `Atrasado` usa ícone + texto + cor; `Vence em breve` usa âmbar; `Pago` reduz destaque sem perder contraste. Não usar vermelho para valores de saída comuns — reservar alerta forte para atraso, erro ou risco.

### 6.12 Critérios de validação visual

- Um usuário deve localizar saldo, próxima conta e ação de adicionar em até poucos segundos, sem treinamento.
- A navegação desktop agrupa os módulos por frequência; no mobile, os cinco destinos principais ficam visíveis e os demais vão para `Mais`.
- Nenhum fluxo crítico depende de hover, gesto de arrastar, cor ou ícone isolado.
- Layout validado em 320, 375, 768, 1024 e 1440 px, com zoom de 200%.
- Conteúdo testado com valores negativos, zero, milhões, descrições longas e listas vazias/densas.
- Revisar as telas com a Vercel Toolbar em previews para layout shift, INP e auditoria automática de acessibilidade.

---

## 7. Estado de Implementação e Próximos Passos

### 7.1 Implementado

- Dashboard geral, fluxo de caixa, gastos, investimentos, cartões e Uber com estados vazios honestos para contas novas; dados de demonstração permanecem isolados e não aparecem em sessões autenticadas.
- Tema claro/escuro persistido, shell responsivo, superfícies sólidas no conteúdo e Liquid Glass restrito a navegação/controles.
- Paleta de gráficos baseada em CSS variables, com contraste próprio para temas claro e escuro; `theme-color` do navegador acompanha o tema.
- Cabeçalhos de página reutilizáveis e navegação desktop agrupada; mobile usa barra inferior de cinco destinos.
- Formulário de receitas, despesas e VR/VA persistido na Supabase; compras no crédito exigem um cartão real e gravam `credit_card_id`.
- Campo monetário reutilizável com prefixo `R$` e preview do cartão, fechamento, vencimento, limite e fatura atual.
- Cadastro de cartões persistido na Supabase e calendário de vencimentos baseado no mês atual.
- Cadastro de veículos e diário Uber com cálculo automático de energia/combustível, custo, lucro, lucro/km e lucro/hora; distância pode ser informada diretamente ou por odômetro inicial/final, com comparação à média de sete dias.
- Cadastro, confirmação de e-mail, login, logout e callback Supabase com `@supabase/ssr` e `proxy.ts` do Next.js 16; confirmação encerra a sessão e exige login explícito.
- Tour guiado vinculado ao usuário no primeiro login.
- Configurações de perfil e estrutura inicial de grupo familiar.
- FastAPI com health check, contratos de transações, cartões, veículos, diário Uber, perfil e convites familiares.
- Quatro migrations Supabase com constraints, índices, RLS, consentimento LGPD, views `security_invoker`, trigger de perfil e RPC de exclusão endurecida.
- Build de produção, TypeScript, ESLint e compilação Python validados.
- Repositório Git privado publicado e sincronizado em `origin/main`.

### 7.2 Próximos passos prioritários

1. Aplicar `supabase/migrations/202607150001_security_hardening.sql` no projeto Supabase existente e executar novamente o Security Advisor.
2. Persistir perfil, investimentos, planejamento, recorrências, garagem e diário Uber; o backend deve recalcular valores financeiros e de consumo.
3. Implementar recuperação de senha e reenvio de confirmação de e-mail.
4. Adicionar políticas familiares que permitam acesso por `household_id` conforme papel, sem ampliar as políticas antes dos fluxos estarem definidos.
5. Gerar o cliente TypeScript pelo OpenAPI e padronizar envelopes de erro.
6. Criar testes unitários de dinheiro/consumo, integração da API e E2E dos fluxos críticos.
7. Configurar GitHub Actions para lint, typecheck, build, testes e validação das migrations.
8. Definir a hospedagem de produção do FastAPI e configurar `NEXT_PUBLIC_API_URL` quando o frontend começar a consumi-lo.

### 7.3 Comandos locais

```powershell
# frontend
cd frontend
npm install
npm run dev

# backend (outro terminal)
cd backend
.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

Arquivos de ambiente devem ser criados a partir dos `.env.example` e nunca versionados. Consultar `DEPLOYMENT.md` para o checklist de publicação.

## 8. Definição de Pronto (Definition of Done)

Uma funcionalidade só está pronta quando:

- Regras de negócio e permissões são validadas no backend.
- API, schema OpenAPI e cliente gerado estão sincronizados.
- A tela cobre loading, vazio, erro, sucesso e responsividade de 320 px até desktop.
- Funciona por teclado, possui foco visível, labels/nome acessível e contraste AA.
- Dinheiro e datas seguem os formatos canônicos; nenhum cálculo monetário usa ponto flutuante.
- Testes proporcionais ao risco passam; fluxos financeiros críticos têm E2E.
- Lint, typecheck, testes, build e migrations passam na CI.
- Logs não expõem senha, token, conteúdo de formulário ou valores financeiros desnecessários.
- Documentação e este arquivo são atualizados quando houver mudança de decisão.

## 9. Referências oficiais

- [Next.js — App Router](https://nextjs.org/docs/app)
- [Next.js — checklist de produção](https://nextjs.org/docs/app/guides/production-checklist)
- [Vercel — Web Interface Guidelines](https://vercel.com/design/guidelines)
- [Vercel — Geist Design System](https://vercel.com/geist/stack)
- [Vercel — redesign da navegação do dashboard (2026)](https://vercel.com/changelog/dashboard-navigation-redesign-rollout)
- [Vercel Geist — Tabs](https://vercel.com/geist/tabs)
- [Vercel Geist — Sheet](https://vercel.com/geist/sheet)
- [Vercel — Toolbar e auditoria de previews](https://vercel.com/docs/vercel-toolbar)
- [Vercel — variáveis de ambiente](https://vercel.com/docs/environment-variables)
- [Supabase — Next.js e autenticação SSR](https://supabase.com/nextjs)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Vercel Templates — dashboard Next.js + shadcn/ui](https://examples.vercel.com/templates/next.js/next-js-and-shadcn-ui-admin-dashboard) — referência visual comunitária; avaliar, não copiar integralmente.
- [Atlassian Design — acessibilidade em drag-and-drop](https://atlassian.design/components/pragmatic-drag-and-drop/accessibility-guidelines/)
- [React — Hooks](https://react.dev/reference/react/hooks)
- [Tailwind CSS — design responsivo](https://tailwindcss.com/docs/responsive-design)
- [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/)

---

*Última atualização: 12/07/2026. Atualizar a data, o estado implementado e as decisões conforme o projeto evolui.*
