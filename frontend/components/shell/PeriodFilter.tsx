"use client";

import { motion } from "motion/react";
import { usePeriodo, type Modo } from "@/lib/usePeriodo";
import { cn } from "@/lib/cn";

const OPCOES: { value: Modo; label: string }[] = [
  { value: "mensal", label: "Mensal" },
  { value: "anual", label: "Anual" },
];

/** Toggle de período global (Mensal | Anual), estado na URL, com indicador deslizante. */
export function PeriodFilter() {
  const { modo, setModo } = usePeriodo();

  return (
    <div
      role="group"
      aria-label="Filtro de período"
      className="ios-glass inline-flex min-h-11 items-center rounded-xl p-1"
    >
      {OPCOES.map((opt) => {
        const active = modo === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => setModo(opt.value)}
            className={cn(
              "relative rounded-[.55rem] px-4 py-1.5 text-sm font-medium transition-colors",
              active ? "text-ink" : "text-ink-soft hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="period-filter-pill"
                className="absolute inset-0 -z-10 rounded-[.55rem] bg-[color-mix(in_oklab,var(--color-accent)_18%,transparent)]"
                transition={{ type: "spring", stiffness: 500, damping: 34 }}
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
