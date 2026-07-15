import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

type GlassVariant = "default" | "liquid" | "hero";

interface GlassCardProps extends ComponentPropsWithoutRef<"div"> {
  /** Visual depth level. */
  variant?: GlassVariant;
  /** @deprecated Use variant="hero" instead. */
  strong?: boolean;
  /** Hover lift + border glow for clickable cards. */
  interactive?: boolean;
}

const variantClass: Record<GlassVariant, string> = {
  default: "surface-card rounded-[var(--radius-card)]",
  liquid: "liquid-glass rounded-[var(--radius-card)]",
  hero: "liquid-glass-hero rounded-[var(--radius-card-lg)]",
};

/** Liquid Glass surface — the primary card primitive. */
export function GlassCard({
  children,
  className,
  variant,
  strong,
  interactive,
  ...props
}: GlassCardProps) {
  // ponytail: backward compat — strong maps to hero
  const resolved = variant ?? (strong ? "hero" : "default");

  return (
    <div
      className={cn(
        variantClass[resolved],
        "relative p-5 transition-all duration-300",
        interactive &&
          "cursor-pointer hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_0_24px_-8px_rgba(129,140,248,0.2)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
