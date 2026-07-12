"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { PeriodFilter } from "./PeriodFilter";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import Link from "next/link";
import { Plus } from "lucide-react";

function tituloDaRota(pathname: string): string {
  const item =
    pathname === "/"
      ? NAV_ITEMS[0]
      : NAV_ITEMS.find((n) => n.href !== "/" && pathname.startsWith(n.href));
  return item?.label ?? "Minha Gestão";
}

/** Barra superior: título da página + filtro de período global + nav mobile. */
export function TopBar() {
  const pathname = usePathname();

  return (
    <header className="flex flex-col gap-4 pb-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Painel
          </p>
          <h1 className="text-xl font-semibold text-ink sm:text-2xl">
            {tituloDaRota(pathname)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/lancamentos" className="btn-primary hidden min-h-11 px-4 sm:inline-flex"><span className="grid size-6 place-items-center rounded-lg bg-white/15"><Plus className="size-4" /></span>Novo lançamento</Link>
          <ThemeToggle />
          <PeriodFilter />
        </div>
      </div>
      <MobileNav />
      <Link href="/lancamentos" aria-label="Novo lançamento" className="btn-primary fixed bottom-5 right-4 z-40 size-14 rounded-full p-0 shadow-2xl sm:hidden"><Plus className="size-6" /></Link>
    </header>
  );
}
