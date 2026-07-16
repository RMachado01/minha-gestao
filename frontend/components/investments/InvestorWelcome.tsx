"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LineChart } from "lucide-react";
import { Sparkline } from "@/components/charts/Sparkline";

const SESSION_KEY = "mg-investor-welcomed";
const ATMOSPHERE_SERIES = [3, 5, 4, 7, 6, 9, 8, 12, 11, 15, 14, 18];

/**
 * Splash de boas-vindas exibido uma vez por sessão ao entrar em Investimentos.
 * Puramente decorativo — não bloqueia nem atrasa o carregamento dos dados reais,
 * que seguem sendo buscados por baixo enquanto a animação roda.
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
      timeout = setTimeout(() => setVisible(false), reduceMotion ? 200 : 1900);
    });
    return () => clearTimeout(timeout);
  }, [reduceMotion]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          aria-hidden
          className="fixed inset-0 z-[120] grid place-items-center overflow-hidden bg-[#060808]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <div className="login-pulse absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[700px] rounded-full bg-[#006b3f]/15 blur-[130px]" />

          <div className="relative flex flex-col items-center gap-4 px-6 text-center">
            <motion.span
              className="grid size-16 place-items-center rounded-3xl bg-[#006b3f]/20 text-[#00a86b]"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <LineChart className="size-7" />
            </motion.span>

            <motion.h1
              className="text-3xl font-semibold tracking-tight text-white sm:text-4xl"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              Bem-vindo, Investidor
            </motion.h1>

            <motion.p
              className="text-sm text-white/60"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              Sua carteira, atualizada.
            </motion.p>

            <motion.div
              className="mt-2 w-48"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.32 }}
            >
              <Sparkline data={ATMOSPHERE_SERIES} color="#00a86b" height={40} />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
