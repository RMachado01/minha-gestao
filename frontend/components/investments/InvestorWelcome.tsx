"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LineChart } from "lucide-react";

const SESSION_KEY = "mg-investor-welcomed";

/**
 * Boas-vindas compactas exibidas uma vez por sessão. Não bloqueiam a tela,
 * a navegação ou a leitura dos dados reais da carteira.
 */
export function InvestorWelcome() {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    let timeout: ReturnType<typeof setTimeout> | undefined;
    void Promise.resolve().then(() => {
      setVisible(true);
      timeout = setTimeout(() => setVisible(false), reduceMotion ? 100 : 1100);
    });
    return () => clearTimeout(timeout);
  }, [reduceMotion]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          aria-hidden
          className="ios-glass pointer-events-none fixed inset-x-4 top-4 z-[70] mx-auto flex max-w-sm items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl sm:left-auto sm:right-5 sm:mx-0"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#006b3f]/20 text-[#00a86b]">
            <LineChart className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-ink">Carteira pronta</p>
            <p className="text-xs text-ink-muted">Sua visão de investimentos está disponível.</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
