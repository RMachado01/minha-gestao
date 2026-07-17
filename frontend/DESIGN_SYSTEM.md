# Contrato de Design — Minha Gestão (leia antes de codar uma tela)

> Este protótipo usa **Next.js 16 (App Router) + React 19 + Tailwind v4 + Recharts 3**.
> A fundação (shell, design system, persistência Supabase e gráficos) está pronta.
> As páginas de produto usam dados da conta autenticada; `lib/mock` permanece apenas
> como legado visual e fonte temporária de tipos, nunca como dados em produção.

## Regras da stack (importante — mais novo que o comum)

- **Tailwind v4**: config é em CSS (`app/globals.css` via `@theme`). Não existe `tailwind.config.js`. Use utilitários normais.
- **Sua página DEVE começar com `"use client";`** — ela usa `usePeriodo()` (hook de URL) e gráficos Recharts (client-only).
- Default export de um componente React. Sem `async`.
- Ícones: `lucide-react`.

## Cores semânticas (obrigatório)

- **Verde** (`text-pos`, `CHART.pos`) = positivo / entrada / lucro.
- **Vermelho** (`text-neg`, `CHART.neg`) = negativo / saída / prejuízo.
- Neutro/acento (`text-accent`, `CHART.accent/accent2/accent3`) = informativo, **não** decorativo.
- Valores em dinheiro: sempre `formatBRL(x)` e className `tnum` (números tabulares).

## Tipo de gráfico por tipo de dado

- **Linha/área** (`TrendLineChart`) → séries temporais / tendência.
- **Barra** (`CompareBarChart`) → comparação entre categorias discretas.
- **Donut** (`CompositionDonut`) → composição de um todo.
- Tabela → detalhamento (use HTML semântico `<table>`).

## Filtro de período (global)

```tsx
import { usePeriodo } from "@/lib/usePeriodo";
const { modo } = usePeriodo(); // "mensal" | "anual"
```
Escolha o dataset conforme `modo` (ex: `getFluxo(modo)`, `getUber(modo)`).

## Primitivos disponíveis

```tsx
import { BentoGrid } from "@/components/ui/BentoGrid";       // grid 12 col, empilha no mobile
import { GlassCard } from "@/components/ui/GlassCard";        // props: strong?, interactive?, className
import { KpiCard } from "@/components/ui/KpiCard";            // label, value(str), trend?(fração), tone?, invertTrend?, hint?, icon?
import { TrendBadge } from "@/components/ui/TrendBadge";      // value(fração), invert? (subir=ruim)
import { SectionHeader } from "@/components/ui/SectionHeader";// title, subtitle?, action?

import { TrendLineChart } from "@/components/charts/TrendLineChart"; // data, xKey, series:[{key,label,color,area?}], minimal?, showLegend?
import { CompareBarChart } from "@/components/charts/CompareBarChart"; // data, xKey, series:[{key,label,color}], stacked?
import { CompositionDonut } from "@/components/charts/CompositionDonut"; // data:[{name,value,color?}], centerLabel?, centerValue?
import { CHART, CATEGORICAL } from "@/components/charts/chartTheme";

import { formatBRL, formatBRLCompact, formatPercent, variacao } from "@/lib/format";
```

## Layout bento — como usar

`BentoGrid` é `grid-cols-12` no desktop. Cada filho controla o tamanho:
```tsx
<BentoGrid>
  <GlassCard className="col-span-12 lg:col-span-8"> ...card grande (hero)... </GlassCard>
  <GlassCard className="col-span-12 sm:col-span-3 lg:col-span-4"> ...KPI... </GlassCard>
</BentoGrid>
```
Varie tamanhos (não tudo uniforme) — hierarquia por escala. Card principal (número grande do topo) usa `strong`.

## Qualidade (anti-template) — checklist

- [ ] `"use client";` no topo.
- [ ] Número grande em destaque no topo, tendência (TrendBadge) logo ao lado/abaixo.
- [ ] Bento com tamanhos variados (não um grid uniforme de cards iguais).
- [ ] Cores semânticas corretas (verde/vermelho).
- [ ] Hover/focus desenhados em elementos interativos (`GlassCard interactive`, botões).
- [ ] Responsivo: em telas ≥ um card por linha só no mobile (`col-span-12`), multi-coluna no `lg`.
- [ ] HTML semântico (`<section>`, `<table>`, `<h2>`), sem `div` soup.
- [ ] Todo dinheiro com `formatBRL` + `tnum`.
- [ ] Nada de gráfico 3D/decorativo. Sem `console.log`.

## Dados

Use os hooks em `@/lib/supabase` ou consultas autenticadas com `createClient()`.
Não importe valores de `@/lib/mock` em telas de produção. Tipos ainda existentes
nesse diretório devem ser importados com `import type` até serem movidos para contratos próprios.
