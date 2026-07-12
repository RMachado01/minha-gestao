import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";

interface TrendBadgeProps {
  /** Variação em fração (0.12 = +12%). */
  value: number;
  /**
   * Quando true, subir é ruim (ex: custo de combustível) — inverte a cor
   * mantendo a direção da seta.
   */
  invert?: boolean;
  className?: string;
}

/** Selo de tendência (seta + %) com cor semântica. */
export function TrendBadge({ value, invert = false, className }: TrendBadgeProps) {
  const up = value >= 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "tnum inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        good
          ? "bg-[color-mix(in_oklab,var(--color-pos)_18%,transparent)] text-pos"
          : "bg-[color-mix(in_oklab,var(--color-neg)_18%,transparent)] text-neg",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
      {formatPercent(Math.abs(value))}
    </span>
  );
}
