"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/cn";

/** Navegação horizontal com scroll (mobile/tablet). Visível abaixo de lg. */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 lg:hidden">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all",
              active
                ? "glass-strong text-ink"
                : "text-ink-soft hover:text-ink",
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-accent" : "text-ink-muted")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
