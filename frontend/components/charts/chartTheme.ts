/** Paleta compartilhada por CSS variables para acompanhar claro/escuro. */
export const CHART = {
  pos: "var(--color-pos)",
  neg: "var(--color-neg)",
  warn: "var(--color-warn)",
  accent: "var(--color-accent)",
  accent2: "var(--color-accent-2)",
  accent3: "var(--color-accent-3)",
  grid: "var(--color-chart-grid)",
  axis: "var(--color-ink-muted)",
  ink: "var(--color-ink)",
} as const;

/** Sequência de cores para categorias (donut/barras multi-série). */
export const CATEGORICAL = [
  CHART.accent,
  CHART.accent2,
  CHART.pos,
  CHART.accent3,
  CHART.warn,
  CHART.neg,
  "#38bdf8",
  "#f472b6",
] as const;

export const AXIS_PROPS = {
  stroke: CHART.axis,
  tick: { fill: CHART.axis, fontSize: 12 },
  tickLine: false,
  axisLine: false,
} as const;
