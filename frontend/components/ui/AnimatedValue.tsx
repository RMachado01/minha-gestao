"use client";

import { useCountUp } from "@/lib/useCountUp";

interface AnimatedValueProps {
  target: number;
  format: (n: number) => string;
  durationMs?: number;
  decimals?: number;
}

/** Renderiza um número com contagem animada até `target`, formatado a cada frame. */
export function AnimatedValue({ target, format, durationMs, decimals = 2 }: AnimatedValueProps) {
  const value = useCountUp(target, durationMs, decimals);
  return <>{format(value)}</>;
}
