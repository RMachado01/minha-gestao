"use client";

import { PeriodFilter } from "./PeriodFilter";
import { ThemeToggle } from "./ThemeToggle";
import { UserAvatar } from "./UserAvatar";
import Link from "next/link";
import { CalendarDays, Plus, ShieldCheck } from "lucide-react";
import { SignOutButton } from "@/components/auth/SignOutButton";

/** Barra superior: filtro de período e ações contextuais. */
export function TopBar() {
  const currentMonth = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="flex flex-col gap-3 border-b border-[var(--color-line)] pb-4">
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:justify-between sm:gap-3">
        <div className="hidden items-center gap-4 text-sm text-ink-soft sm:flex">
          <span className="flex items-center gap-2 capitalize"><CalendarDays className="size-4 text-accent" />{currentMonth}</span>
          <span className="hidden items-center gap-1.5 text-xs text-ink-muted xl:flex"><ShieldCheck className="size-3.5" />Seus dados, sua conta</span>
        </div>
        <div className="flex min-w-0 max-w-full items-center gap-1.5 sm:gap-2">
          <Link
            href="/lancamentos"
            data-tour-desktop="new-launch"
            className="btn-primary topbar-new-launch min-h-11 px-4"
          >
            <span className="grid size-6 place-items-center rounded-[.45rem] bg-white/15">
              <Plus className="size-4" />
            </span>
            Novo lançamento
          </Link>
          <ThemeToggle />
          <PeriodFilter />
          <Link
            href="/configuracoes"
            className="hidden rounded-full transition-transform hover:scale-105 lg:hidden sm:block"
            aria-label="Configurações"
          >
            <UserAvatar size={34} />
          </Link>
          <SignOutButton compact className="lg:hidden" />
        </div>
      </div>
    </header>
  );
}
