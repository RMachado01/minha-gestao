"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { CATEGORICAL } from "./chartTheme";
import { ChartTooltip } from "./ChartTooltip";

export interface DonutSlice {
  name: string;
  value: number;
  /** Cor opcional; se ausente usa a sequência categórica. */
  color?: string;
}

interface CompositionDonutProps {
  data: DonutSlice[];
  height?: number;
  /** Conteúdo central opcional (ex: total). */
  centerLabel?: string;
  centerValue?: string;
}

/** Donut para composição de um todo (gastos por categoria, alocação, etc). */
export function CompositionDonut({
  data,
  height = 260,
  centerLabel,
  centerValue,
}: CompositionDonutProps) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="90%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((slice, i) => (
              <Cell
                key={slice.name}
                fill={slice.color ?? CATEGORICAL[i % CATEGORICAL.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerLabel && (
            <span className="text-xs text-ink-muted">{centerLabel}</span>
          )}
          {centerValue && (
            <span className="tnum text-lg font-semibold text-ink">
              {centerValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
