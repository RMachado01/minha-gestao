# Spec — Protótipo Visual dos Dashboards (Fase 1)

**Data:** 2026-07-11
**Projeto:** Sistema de Gestão Financeira Pessoal
**Fase:** Protótipo visual navegável (frontend-first, dados mock)

---

## 1. Objetivo

Validar a experiência das 6 telas de dashboard **antes** de investir no backend.
O protótipo é construído na **stack real** (Next.js) para não ser descartável: quando
o backend chegar, os dados mock são trocados por chamadas reais e o front já está pronto.

## 2. Decisões travadas (com o usuário)

| Decisão | Escolha |
|---|---|
| Abordagem | **A** — Next.js 14 (App Router) + Tailwind + Recharts, dados mock |
| Escopo de telas | **As 6**: Visão Geral, Fluxo de Caixa, Composição de Gastos, Investimentos, Cartões, Uber |
| Direção visual | **Bento + Glass** — cards de tamanhos variados, profundidade com vidro/sombras, gradientes sutis |
| Idioma / moeda | Português (pt-BR) / Real (R$) |
| Cor semântica | Verde = positivo/entrada/lucro; Vermelho = negativo/saída; neutro = informativo |
| Orquestração | Fundação feita pelo orquestrador → 6 agentes em paralelo (1 tela cada) → agente CEO revisa → consolidação |

## 3. Arquitetura do protótipo

```
/frontend
  /app
    layout.tsx            -> shell global (sidebar + filtro de período)
    page.tsx              -> Visão Geral (Home)
    /fluxo-caixa/page.tsx
    /gastos/page.tsx
    /investimentos/page.tsx
    /cartoes/page.tsx
    /uber/page.tsx
  /components
    /shell                -> Sidebar, TopBar, PeriodFilter
    /ui                   -> GlassCard, KpiCard, BentoGrid, TrendBadge
    /charts               -> LineChart, BarChart, DonutChart (wrappers Recharts)
  /lib
    /mock                 -> dados mock por domínio, formato {periodo, valor}[]
    format.ts             -> formatação R$ e %
    tokens.css            -> design tokens (paleta, tipografia, sombras, vidro)
```

### 3.1 Fundação compartilhada (feita ANTES de paralelizar)

- **Shell**: sidebar com as 6 telas + **filtro de período global (Mensal | Anual)** no topo.
  Estado do filtro persistido na **URL (query params)** — seção 6.3 do claude.md.
- **Design system Bento+Glass**: tokens CSS + primitivos `GlassCard`, `KpiCard`, `BentoGrid`, `TrendBadge`.
- **Camada mock** (`/lib/mock`): dados realistas em R$ já no formato que os endpoints
  reais vão devolver (`{periodo, valor}[]`) — **nenhuma agregação no front** (seção 6.4).
- **Primitivos de gráfico** (Recharts) padronizados por tipo de dado (seção 6.1):
  - Linha → séries temporais / tendência
  - Barra → comparação entre categorias
  - Donut → composição de um todo

### 3.2 As 6 telas (1 arquivo de rota isolado cada)

1. **Visão Geral** — número grande de saldo do mês + mini-linha (6–12 meses) + cards de KPI (entradas, saídas, economia %, próximos vencimentos).
2. **Fluxo de Caixa** — barras entradas vs. saídas lado a lado por mês, toggle mensal/anual.
3. **Composição de Gastos** — donut de gastos por categoria + ranking em tabela.
4. **Investimentos** — linha de evolução (investido x atual) + donut de alocação + rentabilidade %.
5. **Cartões** — barras "limite usado x disponível" por cartão (mín. 3) + linha do total das faturas mês a mês.
6. **Uber** — linha combinada receita bruta / custo combustível / lucro líquido + KPI de tendência (seta alta/queda) comparando períodos.

## 4. Regras de qualidade (anti-template)

- Hierarquia por escala (número grande no topo, tendência logo abaixo).
- Consistência de tipo de gráfico por tipo de dado; sem gráficos 3D/decorativos.
- Cor com significado, não decoração.
- Estados de hover/focus/active desenhados.
- Responsivo: web multi-coluna; mobile empilha cards em coluna única + números principais.
- Acessibilidade: HTML semântico, contraste, navegação por teclado.

## 5. Modelo de orquestração (paralelo + CEO)

1. **Orquestrador** constrói a fundação (§3.1) sozinho — evita colisão entre agentes.
2. **6 agentes em paralelo**, cada um dono de **uma tela** (§3.2), usando `frontend-design` +
   `ui-ux-pro-max` e o design system compartilhado. Arquivos isolados = sem conflito.
3. **Agente CEO (revisor final)** audita: consistência visual entre telas, qualidade anti-template,
   responsividade, acessibilidade, coerência de dados/formatação. Reporta CRITICAL/HIGH/MEDIUM/LOW.
4. **Orquestrador consolida** correções e verifica `dev`/`build` antes de entregar ao usuário.

## 6. Não-escopo (YAGNI nesta fase)

- Backend, banco, autenticação, jobs de recorrência — **fora**.
- Persistência real, CRUD funcional — mock apenas.
- Testes automatizados de front — validação visual manual nesta fase.

## 7. Critérios de sucesso

- As 6 telas navegáveis via sidebar, filtro de período afetando os gráficos.
- Visual Bento+glass coerente e "de produto real" nas 6 telas.
- Responsivo (empilha em mobile).
- `npm run dev` sobe sem erros; `npm run build` passa.
- CLAUDE.md atualizado com as decisões desta fase.
