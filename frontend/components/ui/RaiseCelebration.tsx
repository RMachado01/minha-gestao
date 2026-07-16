"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PartyPopper } from "lucide-react";
import { useMemo } from "react";

const CONFETTI_COLORS = ["#00a86b", "#006b3f", "#34d399", "#facc15", "#60a5fa", "#f472b6"];

interface ConfettiPiece {
  id: number;
  left: number;
  color: string;
  delay: number;
  duration: number;
  rotate: number;
  size: number;
}

function makeConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 0.3,
    duration: 1.6 + Math.random() * 0.9,
    rotate: Math.random() * 360,
    size: 6 + Math.random() * 6,
  }));
}

/**
 * Celebração exibida quando um valor recorrente (salário, VR/VA) é editado
 * para um número maior que o anterior — confete puramente CSS/motion, sem
 * dependência nova, respeitando prefers-reduced-motion.
 */
export function RaiseCelebration({ visible, message, onClose }: { visible: boolean; message: string; onClose: () => void }) {
  const reduceMotion = useReducedMotion();
  const pieces = useMemo(() => (visible && !reduceMotion ? makeConfetti(36) : []), [visible, reduceMotion]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[130] grid place-items-center overflow-hidden bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {pieces.map((piece) => (
            <motion.span
              key={piece.id}
              aria-hidden
              className="absolute top-0 rounded-sm"
              style={{ left: `${piece.left}%`, width: piece.size, height: piece.size * 0.4, backgroundColor: piece.color }}
              initial={{ y: -40, opacity: 1, rotate: 0 }}
              animate={{ y: "110vh", opacity: [1, 1, 0], rotate: piece.rotate }}
              transition={{ duration: piece.duration, delay: piece.delay, ease: "easeIn" }}
            />
          ))}

          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="raise-celebration-title"
            className="liquid-glass-hero relative w-full max-w-sm overflow-hidden rounded-[2rem] p-8 text-center"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 340, damping: 24 }}
            onClick={(event) => event.stopPropagation()}
          >
            <motion.div
              className="mx-auto grid size-16 place-items-center rounded-3xl bg-emerald-400/15 text-pos"
              initial={reduceMotion ? undefined : { scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 16, delay: 0.1 }}
            >
              <PartyPopper className="size-8" />
            </motion.div>
            <h2 id="raise-celebration-title" className="mt-5 text-xl font-semibold text-ink">{message}</h2>
            <button type="button" onClick={onClose} className="btn-primary mt-6 w-full justify-center">Continuar</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
