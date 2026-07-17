"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { CHART, AXIS_PROPS } from "./chartTheme";
import { ChartTooltip } from "./ChartTooltip";
import { formatBRLCompact } from "@/lib/format";

export interface Serie {
  key: string;
  label: string;
  color: string;
  /** Preenche a área sob a linha (bom para série principal / mini-chart). */
  area?: boolean;
  /** Projeções são lilás/tracejadas para não parecerem dado realizado. */
  projection?: boolean;
}

interface TrendLineChartProps {
  data: Array<Record<string, string | number>>;
  /** Chave do eixo X (ex: "periodo"). */
  xKey: string;
  series: Serie[];
  height?: number;
  /** Esconde eixos/grid — usado no mini-gráfico do hero. */
  minimal?: boolean;
  /** Alias de `minimal` para consistência com o prop `dense` dos outros gráficos. */
  dense?: boolean;
  showLegend?: boolean;
  ariaLabel?: string;
}

/** Linha/área para séries temporais e tendência. */
export function TrendLineChart({
  data,
  xKey,
  series,
  height = 260,
  minimal = false,
  dense = false,
  showLegend = false,
  ariaLabel,
}: TrendLineChartProps) {
  const isMinimal = minimal || dense;
  return (
    <div role="img" aria-label={ariaLabel ?? `Gráfico temporal de ${series.map((item) => item.label).join(", ")}, com ${data.length} períodos`}>
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: isMinimal ? 0 : 4, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {!isMinimal && <CartesianGrid stroke={CHART.grid} vertical={false} />}
        {!isMinimal && <XAxis dataKey={xKey} {...AXIS_PROPS} />}
        {!isMinimal && (
          <YAxis
            {...AXIS_PROPS}
            width={56}
            tickFormatter={(v) => formatBRLCompact(Number(v))}
          />
        )}
        {!isMinimal && <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART.grid }} />}
        {showLegend && <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: CHART.ink }} />}
        {series.map((s) =>
          s.area ? (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2.5}
              strokeDasharray={s.projection ? "7 6" : undefined}
              fill={`url(#grad-${s.key})`}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ) : (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2.5}
              strokeDasharray={s.projection ? "7 6" : undefined}
              fill="none"
              dot={false}
              activeDot={{ r: 4 }}
            />
          ),
        )}
      </AreaChart>
    </ResponsiveContainer>
    </div>
  );
}
