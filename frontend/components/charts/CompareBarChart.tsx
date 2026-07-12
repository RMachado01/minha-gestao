"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { CHART, AXIS_PROPS } from "./chartTheme";
import { ChartTooltip } from "./ChartTooltip";
import { formatBRLCompact } from "@/lib/format";

interface BarSerie {
  key: string;
  label: string;
  color: string;
}

interface CompareBarChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: BarSerie[];
  height?: number;
  /** Empilha as barras em vez de agrupar lado a lado. */
  stacked?: boolean;
  showLegend?: boolean;
}

/** Barras para comparação entre categorias discretas (entradas x saídas, etc). */
export function CompareBarChart({
  data,
  xKey,
  series,
  height = 300,
  stacked = false,
  showLegend = true,
}: CompareBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barGap={6}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey={xKey} {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} width={56} tickFormatter={(v) => formatBRLCompact(Number(v))} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        {showLegend && <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: CHART.ink }} />}
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color}
            stackId={stacked ? "stack" : undefined}
            radius={stacked ? [0, 0, 0, 0] : [6, 6, 0, 0]}
            maxBarSize={44}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
