import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Slot à direita (ex: legenda, ação). */
  action?: ReactNode;
}

/** Cabeçalho de seção/card com título e ação opcional. */
export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-[.95rem] font-semibold tracking-[-.01em] text-ink">{title}</h3>
        {subtitle && (
          <p className="mt-1 text-xs leading-5 text-ink-muted">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
