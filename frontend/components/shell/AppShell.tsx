"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { FinancialAdvisorWidget } from "@/components/advisor/FinancialAdvisorWidget";

const PUBLIC_ROUTES = new Set(["/login", "/cadastro", "/termos", "/privacidade", "/redefinir-senha"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  if (PUBLIC_ROUTES.has(pathname)) return <>{children}</>;

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-[1400px] px-4 pt-5 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="h-16" />}><TopBar /></Suspense>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={pathname}
            className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-24 pt-2 sm:px-6 lg:px-8"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.24, ease: [0.16, 1, 0.3, 1] }}
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
