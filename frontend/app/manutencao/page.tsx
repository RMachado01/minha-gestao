"use client";

import { motion, useReducedMotion } from "motion/react";
import { Construction, Sparkles, Wallet } from "lucide-react";

export default function ManutencaoPage() {
  const reduceMotion = useReducedMotion();

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div aria-hidden className="login-float absolute left-[5%] top-[10%] size-80 rounded-full bg-[#006b3f]/20 blur-[80px]" />
      <div aria-hidden className="login-float-delayed absolute bottom-[8%] right-[8%] size-96 rounded-full bg-[#00a86b]/15 blur-[100px]" />
      <div aria-hidden className="login-pulse absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-[#006b3f]/10 blur-[120px]" />

      <section
        className="login-card-enter ios-glass relative w-full max-w-md overflow-hidden rounded-[2rem] p-8 text-center sm:p-10"
        aria-labelledby="manutencao-title"
      >
        <div className="mb-6 flex items-center justify-center gap-2 text-ink-muted">
          <Wallet className="size-4" />
          <span className="text-xs font-medium tracking-wide">Minha Gestão</span>
        </div>

        <motion.div
          className="mx-auto grid size-20 place-items-center rounded-3xl bg-[#006b3f]/20 text-[#00a86b]"
          animate={reduceMotion ? undefined : { rotate: [0, -14, 12, -8, 6, 0] }}
          transition={reduceMotion ? undefined : { duration: 2.4, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut" }}
        >
          <Construction className="size-9" />
        </motion.div>

        <h1 id="manutencao-title" className="mt-6 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Estamos em obras
        </h1>
        <p className="mt-3 text-sm text-ink-soft sm:text-base">
          Voltamos já — estamos fazendo um ajuste rápido nos bastidores para deixar sua conta ainda mais segura.
        </p>

        <div className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-[#006b3f] to-[#00a86b]"
            animate={reduceMotion ? undefined : { x: ["-110%", "230%"] }}
            transition={reduceMotion ? undefined : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-ink-muted">
          <Sparkles className="size-3.5" />
          Obrigado pela paciência
        </p>
      </section>
    </main>
  );
}
