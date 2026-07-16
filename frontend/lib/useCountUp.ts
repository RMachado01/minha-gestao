"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Anima um número de 0 até `target` na montagem/troca de valor.
 * Retorna o valor corrente já arredondado nas casas de `decimals`.
 * Cai para o valor final direto quando o usuário prefere menos movimento.
 */
export function useCountUp(target: number, durationMs = 650, decimals = 2): number {
  const reduceMotion = useReducedMotion();
  const [animated, setAnimated] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (reduceMotion) return;

    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs);
      setAnimated(target * EASE_OUT(progress));
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      }
    }

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [target, durationMs, reduceMotion]);

  const factor = 10 ** decimals;
  const value = reduceMotion ? target : animated;
  return Math.round(value * factor) / factor;
}
