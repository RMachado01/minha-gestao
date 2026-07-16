"use client";

import { useRef, type MouseEvent } from "react";
import { motion, useMotionValue, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/cn";

type GlassVariant = "default" | "liquid" | "hero";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  /** Visual depth level. */
  variant?: GlassVariant;
  /** @deprecated Use variant="hero" instead. */
  strong?: boolean;
  /** Hover lift + border glow + cursor spotlight + subtle tilt for clickable cards. */
  interactive?: boolean;
}

const variantClass: Record<GlassVariant, string> = {
  default: "surface-card rounded-[var(--radius-card)]",
  liquid: "liquid-glass rounded-[var(--radius-card)]",
  hero: "liquid-glass-hero rounded-[var(--radius-card-lg)]",
};

const TILT_DEGREES = 5;

/** Liquid Glass surface — the primary card primitive. */
export function GlassCard({
  children,
  className,
  variant,
  strong,
  interactive,
  style,
  onMouseMove,
  onMouseLeave,
  ...props
}: GlassCardProps) {
  // ponytail: backward compat — strong maps to hero
  const resolved = variant ?? (strong ? "hero" : "default");
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    onMouseMove?.(event);
    if (!interactive || reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    ref.current.style.setProperty("--spot-x", `${px * 100}%`);
    ref.current.style.setProperty("--spot-y", `${py * 100}%`);
    ref.current.style.setProperty("--spot-opacity", "1");
    rotateY.set((px - 0.5) * TILT_DEGREES * 2);
    rotateX.set((0.5 - py) * TILT_DEGREES * 2);
  }

  function handleMouseLeave(event: MouseEvent<HTMLDivElement>) {
    onMouseLeave?.(event);
    if (!interactive) return;
    ref.current?.style.setProperty("--spot-opacity", "0");
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      ref={ref}
      className={cn(
        variantClass[resolved],
        "relative p-5 transition-[border-color,box-shadow] duration-300",
        interactive &&
          "card-spotlight cursor-pointer hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_0_24px_-8px_rgba(129,140,248,0.2)]",
        className,
      )}
      style={
        interactive && !reduceMotion
          ? { ...style, rotateX, rotateY, transformPerspective: 800 }
          : style
      }
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </motion.div>
  );
}
