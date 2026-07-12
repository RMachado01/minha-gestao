"use client";

import { formatBRL } from "@/lib/format";

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: TooltipEntry[];
  /** Formatação dos valores numéricos (padrão: R$). */
  formatter?: (v: number) => string;
}

/**
 * Tooltip de vidro padronizado. Recharts injeta `active`/`payload`/`label`
 * ao clonar este elemento em `content={<ChartTooltip />}`; por isso os props
 * são opcionais.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  formatter = formatBRL,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-xs shadow-xl">
      {label !== undefined && (
        <p className="mb-1 font-semibold text-ink">{String(label)}</p>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-ink-soft">{entry.name}</span>
            <span className="tnum ml-auto font-medium text-ink">
              {typeof entry.value === "number"
                ? formatter(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
