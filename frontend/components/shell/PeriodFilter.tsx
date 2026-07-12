"use client";

import { usePeriodo, type Modo } from "@/lib/usePeriodo";
import { cn } from "@/lib/cn";

const OPCOES: { value: Modo; label: string }[] = [
  { value: "mensal", label: "Mensal" },
  { value: "anual", label: "Anual" },
];

/** Toggle de período global (Mensal | Anual), estado na URL. */
export function PeriodFilter() {
  const { modo, setModo } = usePeriodo();

  return (
    <div
      role="group"
      aria-label="Filtro de período"
      className="ios-glass inline-flex min-h-11 items-center rounded-2xl p-1"
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
              "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
              active
                ? "bg-[color-mix(in_oklab,var(--color-accent)_28%,transparent)] text-ink"
                : "text-ink-soft hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
