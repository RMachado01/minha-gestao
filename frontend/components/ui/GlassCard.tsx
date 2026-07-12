import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

interface GlassCardProps extends ComponentPropsWithoutRef<"div"> {
  /** Vidro mais denso para o card principal (hero). */
  strong?: boolean;
  /** Ativa hover elevado (para cards clicáveis/interativos). */
  interactive?: boolean;
}

/** Superfície de vidro padrão do design system Bento+Glass. */
export function GlassCard({
  children,
  className,
  strong,
  interactive,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        strong ? "surface-card-strong" : "surface-card",
        "relative rounded-[var(--radius-bento)] p-5 transition-all duration-300",
        interactive &&
          "hover:-translate-y-0.5 hover:border-[var(--color-line-strong)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
