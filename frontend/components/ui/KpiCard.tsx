import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { GlassCard } from "./GlassCard";
import { TrendBadge } from "./TrendBadge";
import { AnimatedValue } from "./AnimatedValue";
import { Sparkline } from "@/components/charts/Sparkline";
import { CHART } from "@/components/charts/chartTheme";
import { cn } from "@/lib/cn";

interface KpiCardProps
  extends Omit<ComponentPropsWithoutRef<typeof GlassCard>, "children"> {
  label: string;
  /** Valor já formatado (ex: "R$ 4.820,00"). */
  value: string;
  /**
   * Valor numérico bruto correspondente a `value`. Quando informado junto de
   * `formatValue`, o card anima uma contagem até esse número em vez de
   * apenas exibir `value` estático.
   */
  numericValue?: number;
  /** Formata `numericValue` a cada frame da animação (ex: formatBRL). */
  formatValue?: (n: number) => string;
  /** Casas decimais mantidas durante a contagem (padrão: 2). */
  decimals?: number;
  /** Série curta (últimos N pontos) para o mini-gráfico inline abaixo do valor. */
  sparklineData?: number[];
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

const stripeClass = {
  pos: "accent-stripe-pos",
  neg: "accent-stripe-neg",
  neutral: "accent-stripe-neutral",
} as const;

const chipToneClass = {
  pos: "text-pos bg-[color-mix(in_oklab,var(--color-pos)_16%,transparent)]",
  neg: "text-neg bg-[color-mix(in_oklab,var(--color-neg)_16%,transparent)]",
  neutral: "text-accent-2 bg-[color-mix(in_oklab,var(--color-accent-2)_16%,transparent)]",
} as const;

const sparkColor = {
  pos: CHART.pos,
  neg: CHART.neg,
  neutral: CHART.accent2,
} as const;

/** KPI card with liquid glass, accent stripe, glow icon chip and optional count-up + sparkline. */
export function KpiCard({
  label,
  value,
  numericValue,
  formatValue,
  decimals,
  sparklineData,
  trend,
  invertTrend,
  icon,
  tone = "neutral",
  hint,
  className,
  interactive,
  ...cardProps
}: KpiCardProps) {
  return (
    <GlassCard
      variant="liquid"
      interactive={interactive ?? true}
      className={cn("flex flex-col gap-3", stripeClass[tone], className)}
      {...cardProps}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-soft">{label}</span>
        {icon && (
          <span className={cn("relative grid size-9 place-items-center rounded-xl", chipToneClass[tone])}>
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className={cn("tnum text-2xl font-semibold", toneClass[tone])}>
          {numericValue !== undefined && formatValue ? (
            <AnimatedValue target={numericValue} format={formatValue} decimals={decimals} />
          ) : (
            value
          )}
        </span>
        {trend !== undefined && <TrendBadge value={trend} invert={invertTrend} />}
      </div>
      {sparklineData && sparklineData.length > 1 && (
        <Sparkline data={sparklineData} color={sparkColor[tone]} height={30} />
      )}
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </GlassCard>
  );
}
