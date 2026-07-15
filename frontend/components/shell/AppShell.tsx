"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";

const PUBLIC_ROUTES = new Set(["/login", "/cadastro", "/termos", "/privacidade"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (PUBLIC_ROUTES.has(pathname)) return <>{children}</>;

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-[1400px] px-4 pt-5 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="h-16" />}><TopBar /></Suspense>
        </div>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-24 pt-2 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="h-64" />}>{children}</Suspense>
        </main>
      </div>
      <OnboardingTour />
    </div>
  );
}
