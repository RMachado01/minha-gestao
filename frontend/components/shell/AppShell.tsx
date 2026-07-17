"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { FinancialAdvisorWidget } from "@/components/advisor/FinancialAdvisorWidget";

const PUBLIC_ROUTES = new Set(["/login", "/cadastro", "/termos", "/privacidade", "/redefinir-senha", "/manutencao"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  if (PUBLIC_ROUTES.has(pathname)) return <>{children}</>;

  return (
    <div className="flex min-h-dvh min-w-0 max-w-full overflow-x-clip">
      <a href="#main-content" className="fixed left-4 top-3 z-[var(--z-skip)] -translate-y-20 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0">Pular para o conteúdo</a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-10 lg:pt-6">
          <Suspense fallback={<div className="h-16" />}><TopBar /></Suspense>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            id="main-content"
            tabIndex={-1}
            key={pathname}
            className="mx-auto w-full min-w-0 max-w-[1440px] flex-1 px-4 pb-40 pt-3 sm:px-6 lg:px-10 lg:pb-10"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Suspense fallback={<div className="h-64" />}>{children}</Suspense>
          </motion.main>
        </AnimatePresence>
      </div>
      <OnboardingTour />
      <FinancialAdvisorWidget />
    </div>
  );
}
