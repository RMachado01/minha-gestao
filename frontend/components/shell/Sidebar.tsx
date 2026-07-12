"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/cn";

/** Sidebar vertical (desktop). Escondida abaixo de lg — ver MobileNav. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-2 rounded-none border-y-0 border-l-0 p-4 lg:flex">
      <div className="mb-6 flex items-center gap-2.5 px-2 pt-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--color-accent)_22%,transparent)] text-accent">
          <Wallet className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-ink">Minha Gestão</p>
          <p className="text-[11px] text-ink-muted">Financeiro pessoal</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-[color-mix(in_oklab,var(--color-accent)_16%,transparent)] text-ink"
                  : "text-ink-soft hover:bg-white/5 hover:text-ink",
              )}
            >
              <Icon
                className={cn(
                  "h-4.5 w-4.5 transition-colors",
                  active ? "text-accent" : "text-ink-muted group-hover:text-ink-soft",
                )}
              />
              {label}
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </nav>

      <p className="mt-auto px-3 text-[11px] text-ink-muted">
        Protótipo · dados fictícios
      </p>
    </aside>
  );
}
