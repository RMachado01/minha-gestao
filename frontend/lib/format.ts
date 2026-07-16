/** Formatação pt-BR para valores monetários e percentuais. */

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const pct = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** R$ 1.234,56 */
export function formatBRL(value: number): string {
  return brl.format(value);
}

/** R$ 1,2 mil — para eixos de gráfico e espaços curtos. */
export function formatBRLCompact(value: number): string {
  return brlCompact.format(value);
}

/** Recebe fração (0.12) → "+12,0%". `signed` adiciona o sinal +. */
export function formatPercent(fraction: number, signed = false): string {
  const s = pct.format(fraction);
  return signed && fraction > 0 ? `+${s}` : s;
}

/** dd/mm/yyyy (ou dd/mm com `withYear=false`) a partir de uma data ISO (YYYY-MM-DD). */
export function formatDateBR(iso: string, withYear = true): string {
  const [y, m, d] = iso.split("-");
  return withYear ? `${d}/${m}/${y}` : `${d}/${m}`;
}

/** Variação percentual entre dois períodos, protegido contra divisão por zero. */
export function variacao(atual: number, anterior: number): number {
  if (anterior === 0) return 0;
  return (atual - anterior) / anterior;
}
