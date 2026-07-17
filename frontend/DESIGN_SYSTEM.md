# Contrato de Design — Minha Gestão

> Next.js 16 (App Router) + React 19 + Tailwind v4 + Recharts 3. A especificação visual completa está em [`design-system/minha-gest-o/MASTER.md`](../design-system/minha-gest-o/MASTER.md).

## Direção: Quiet Intelligence

A interface é uma mesa de decisão financeira calma, precisa e humana. Ela deve responder primeiro **o que mudou** e **qual ação faz sentido**; gráficos e tabelas sustentam essa resposta.

- Dados reais e estados vazios honestos. Nunca usar números fictícios em sessão autenticada.
- Quatro níveis: fundo, cartão sólido, destaque elevado e vidro apenas em navegação, modais e sheets.
- Verde representa marca/ação ou resultado positivo; vermelho é negativo; lilás identifica IA e projeções.
- Geist na interface; Newsreader apenas em títulos/briefings; Geist Mono apenas para ticker, código ou identificador.
- Movimento de 150–320 ms com causa e efeito. Sem shimmer, tilt, spotlight ou blobs animados.

## Regras da stack

- Tailwind v4 é configurado em `app/globals.css` via `@theme`; não existe `tailwind.config.js`.
- Use Client Components somente onde há hooks, eventos ou bibliotecas client-only. Páginas públicas podem ser Server Components.
- Ícones são sempre `lucide-react`; nada de emoji estrutural.
- Valores monetários usam `formatBRL()` e `tnum`.
- Consultas autenticadas usam hooks de `@/lib/supabase` ou `createClient()`; não importar valores de `@/lib/mock`.

## Superfícies e componentes

```tsx
<GlassCard variant="default" />  // cartão sólido de dados
<GlassCard variant="hero" />     // destaque elevado
<GlassCard interactive />        // somente se o card inteiro for clicável
```

O nome `GlassCard` permanece por compatibilidade; `default` e `hero` não aplicam blur. `liquid-glass`, usado por telas legadas, também foi remapeado para superfície sólida. `shell-glass`, `ios-glass` e sheets são as exceções.

Primitivos principais:

- `PageHeader`: título editorial e descrição.
- `BentoGrid`: 12 colunas no desktop, empilhamento no mobile.
- `KpiCard`: indicador de apoio, não hero.
- `DailyBriefing`: interpretação contextual do dashboard.
- `FinancialAdvisorWidget`: Inteligência global com origem/período dos dados.
- `MoneyInput`: máscara BRL com centavos automáticos.
- `SelectField`: select com affordance consistente.

## Gráficos

- Tendência: `TrendLineChart`; comparação: `CompareBarChart`; composição: `CompositionDonut`.
- Histórico é linha sólida. Projeção usa `projection: true`, cor lilás e linha tracejada.
- Grade discreta, valores localizados, tooltip e `aria-label`/resumo textual.
- Donut não deve exceder cinco categorias; acima disso, prefira barras.

## Checklist de entrega

- [ ] Um CTA primário por contexto; botões sem gradiente decorativo.
- [ ] Alvos interativos com pelo menos 44×44 px e foco visível.
- [ ] Labels de formulário visíveis, loading e erro com caminho de recuperação.
- [ ] Claro/escuro testados de forma independente.
- [ ] 375, 768, 1024 e 1440 px sem overflow ou conteúdo atrás de elementos fixos.
- [ ] `prefers-reduced-motion` e `prefers-reduced-transparency` respeitados.
- [ ] HTML semântico; gráficos possuem alternativa textual/tabela quando são essenciais.
- [ ] Lint, TypeScript, testes, build e verificação visual concluídos.
