"use client";

import { useId, useMemo } from "react";

interface SparklineProps {
  /** Série de valores (ordem cronológica). Mínimo 2 pontos para desenhar uma linha. */
  data: number[];
  color: string;
  height?: number;
  className?: string;
  /** Preenche a área sob a linha com um gradiente sutil da cor. */
  area?: boolean;
}

/**
 * Mini-gráfico de tendência em SVG puro (sem Recharts) — leve o suficiente
 * para viver dentro de um KpiCard sem custo de renderização por card.
 */
export function Sparkline({ data, color, height = 32, className, area = true }: SparklineProps) {
  const gradientId = useId();

  const path = useMemo(() => {
    if (data.length < 2) return { line: "", fill: "" };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = 100 / (data.length - 1);

    const points = data.map((v, i) => {
      const x = i * stepX;
      const y = 100 - ((v - min) / range) * 100;
      return [x, y] as const;
    });

    const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    const fill = `${line} L100,100 L0,100 Z`;
    return { line, fill };
  }, [data]);

  if (!path.line) return null;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      width="100%"
      height={height}
      className={className}
      aria-hidden="true"
    >
      {area && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {area && <path d={path.fill} fill={`url(#${gradientId})`} stroke="none" />}
      <path
        d={path.line}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
