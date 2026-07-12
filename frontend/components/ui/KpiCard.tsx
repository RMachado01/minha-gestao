import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { GlassCard } from "./GlassCard";
import { TrendBadge } from "./TrendBadge";
import { cn } from "@/lib/cn";

interface KpiCardProps
  extends Omit<ComponentPropsWithoutRef<typeof GlassCard>, "children"> {
  label: string;
  /** Valor já formatado (ex: "R$ 4.820,00"). */
  value: string;
  /** Variação opcional em fração para o TrendBadge. */
  trend?: number;
  /** Inverte a semântica de cor da tendência (subir = ruim). */
  invertTrend?: boolean;
  icon?: ReactNode;
  /** Cor de destaque do valor: positivo, negativo ou neutro (padrão). */
  tone?: "pos" | "neg" | "neutral";
  hint?: string;
}

const toneClass = {
  pos: "text-pos",
  neg: "text-neg",
  neutral: "text-ink",
} as const;

/** Card de KPI padrão: rótulo, número em destaque e tendência opcional. */
export function KpiCard({
  label,
  value,
  trend,
  invertTrend,
  icon,
  tone = "neutral",
  hint,
  className,
  ...cardProps
}: KpiCardProps) {
  return (
    <GlassCard className={cn("flex flex-col gap-3", className)} {...cardProps}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-soft">{label}</span>
        {icon && <span className="text-ink-muted">{icon}</span>}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className={cn("tnum text-2xl font-semibold", toneClass[tone])}>
          {value}
        </span>
        {trend !== undefined && <TrendBadge value={trend} invert={invertTrend} />}
      </div>
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </GlassCard>
  );
}
