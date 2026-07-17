# Minha Gestão — Quiet Intelligence

Sistema visual oficial. A interface deve parecer uma mesa de decisão financeira calma, precisa e humana — não um dashboard genérico de SaaS.

## Princípios

1. **A resposta vem antes do gráfico.** Cada página explica o que mudou e qual ação faz sentido.
2. **Dados reais, estados honestos.** Nunca preencher telas vazias com números fictícios.
3. **Hierarquia por superfície.** Fundo → cartão sólido → destaque elevado → vidro somente em navegação, sheets e modais.
4. **IA contextual e explicável.** Insights citam a base usada e oferecem uma ação; lilás identifica projeções/IA, verde identifica finanças positivas.
5. **Movimento com causa.** Transições de 140–320 ms; sem brilhos, blobs ou shimmer infinitos.

## Tokens

| Papel | Escuro | Claro |
| --- | --- | --- |
| Fundo | `#07100D` | `#F4F5F0` |
| Fundo suave | `#0A130F` | `#ECEFE9` |
| Cartão | `#0F1814` | `#FFFFFF` |
| Elevado | `#15211B` | `#F8FAF7` |
| Texto | `#F4F7F5` | `#142019` |
| Texto secundário | `#A7B4AC` | `#526159` |
| Texto discreto | `#74837A` | `#6B7971` |
| Marca/ação | `#3CCB8A` | `#0D6B4E` |
| IA/projeção | `#9296E8` | `#676BB8` |
| Positivo | `#55D69A` | `#087A50` |
| Negativo | `#FF8797` | `#C73B52` |

- Controles: raio 12 px.
- Cartões: raio 20 px.
- Destaques/sheets: raio 28 px.
- Linha escura: branco 10%; linha clara: verde-preto 12%.
- Sombra apenas para elevação real; cartões de dados usam borda e contraste de fundo.

## Tipografia

- **Geist:** interface, corpo, números e controles.
- **Newsreader:** títulos de página e frases editoriais de briefing; nunca em tabelas ou botões.
- **Geist Mono:** ticker, código, data técnica e identificadores.
- Valores usam números tabulares. Títulos não usam gradiente.

## Layout

- Conteúdo máximo: 1440 px; desktop com sidebar calma e persistente.
- Dashboard: saldo/visão histórica (8 colunas), briefing inteligente (4 colunas), decisões e vencimentos abaixo.
- Mobile: 4 destinos + ação central + catálogo “Mais”; nada importante fica apenas no desktop.
- Alvos interativos mínimos: 44×44 px.

## Componentes

- **Botão primário:** preenchimento sólido da marca, sem gradiente; hover por luminosidade e sombra curta.
- **Cartão:** sólido, borda fina, sem blur. Interativo recebe borda mais forte e elevação de 2 px.
- **Vidro:** blur de 20–24 px, reservado a sidebar, barra mobile, modal e sheet.
- **Campo/select:** fundo elevado, borda clara, label fora do input, foco de 3 px.
- **Gráficos:** histórico sólido; projeção lilás tracejada; grade discreta; legenda textual e resumo acessível.
- **IA:** “Inteligência da conta”, ícone de radar/circuito, selo “Dados da sua conta” e indicação de quantidade/período analisado.

## Movimento e acessibilidade

- Rápido 150 ms, padrão 220 ms, sheet 320 ms; easing `cubic-bezier(.2,.8,.2,1)`.
- Entrada de página: opacidade + 6 px, sem saída animada que atrase navegação.
- Respeitar `prefers-reduced-motion` e `prefers-reduced-transparency`.
- Contraste AA, foco sempre visível, nunca depender somente de cor.
- Testar 375, 768, 1024 e 1440 px em claro e escuro.

## Proibido

- Vidro em todos os cartões, gradiente em todos os botões, brilho neon, shimmer infinito.
- Cards de KPI com o mesmo peso visual quando um deles é decisivo.
- Sparkles como identidade genérica de IA.
- Tilt 3D, spotlight seguindo cursor ou hover que desloca layout.
- Texto fictício para “encher” dashboards vazios.
