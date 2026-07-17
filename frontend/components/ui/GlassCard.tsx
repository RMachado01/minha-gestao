"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/cn";

type GlassVariant = "default" | "liquid" | "hero";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  variant?: GlassVariant;
  /** @deprecated Use variant="hero" instead. */
  strong?: boolean;
  /** Adds restrained hover/press feedback when the whole card is clickable. */
  interactive?: boolean;
}

const variantClass: Record<GlassVariant, string> = {
  default: "surface-card rounded-[var(--radius-card)]",
  liquid: "liquid-glass rounded-[var(--radius-card)]",
  hero: "liquid-glass-hero rounded-[var(--radius-card-lg)]",
};

/** Hierarchical surface primitive. The legacy name is kept to avoid churn. */
export function GlassCard({
  children,
  className,
  variant,
  strong,
  interactive,
  ...props
}: GlassCardProps) {
  const resolved = variant ?? (strong ? "hero" : "default");
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(
        variantClass[resolved],
        "relative p-5 transition-[border-color,box-shadow,transform] duration-200",
        interactive &&
          "cursor-pointer hover:-translate-y-0.5 hover:border-[var(--color-line-strong)] hover:shadow-[var(--shadow-elevated)]",
        className,
      )}
      whileTap={interactive && !reduceMotion ? { y: 1 } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}
