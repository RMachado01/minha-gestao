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
        strong ? "ios-glass" : "glass",
        "relative rounded-[var(--radius-bento)] p-5 transition-all duration-300 before:pointer-events-none before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent",
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
