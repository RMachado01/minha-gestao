/** Paleta e tokens compartilhados dos gráficos (hex, pois Recharts pinta em SVG). */
export const CHART = {
  pos: "#34d399",
  neg: "#fb7185",
  warn: "#fbbf24",
  accent: "#818cf8",
  accent2: "#22d3ee",
  accent3: "#c084fc",
  grid: "rgba(255,255,255,0.06)",
  axis: "#6b7690",
  ink: "#eef2fb",
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
