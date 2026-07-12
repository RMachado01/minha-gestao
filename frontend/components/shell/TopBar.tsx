"use client";

import { PeriodFilter } from "./PeriodFilter";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";

/** Barra superior: título da página + filtro de período global + nav mobile. */
export function TopBar() {
  return (
    <header className="flex flex-col gap-4 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="hidden items-center gap-2 text-sm text-ink-soft sm:flex"><CalendarDays className="size-4 text-accent" /><span>Julho de 2026</span></div>
        <div className="flex items-center gap-2">
          <Link href="/lancamentos" className="btn-primary hidden min-h-11 px-4 sm:inline-flex"><span className="grid size-6 place-items-center rounded-lg bg-white/15"><Plus className="size-4" /></span>Novo lançamento</Link>
          <ThemeToggle />
          <PeriodFilter />
        </div>
      </div>
      <MobileNav />
    </header>
  );
}
