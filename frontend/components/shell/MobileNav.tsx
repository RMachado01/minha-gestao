"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, LayoutDashboard, Menu, Plus, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/fluxo-caixa", label: "Fluxo", icon: TrendingUp },
  { href: "/lancamentos", label: "Adicionar", icon: Plus, primary: true },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/configuracoes", label: "Mais", icon: Menu },
];

/** Barra inferior mobile, otimizada para alcance com uma mão. */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="ios-glass fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-[1.4rem] p-1.5 pb-[max(.375rem,env(safe-area-inset-bottom))] lg:hidden" aria-label="Navegação principal">
      {ITEMS.map(({ href, label, icon: Icon, primary }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-medium transition-all",
              primary && "-mt-5 min-h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-500/25",
              active
                ? primary ? "text-white" : "bg-[color-mix(in_oklab,var(--color-accent)_14%,transparent)] text-ink"
                : "text-ink-soft hover:text-ink",
            )}
          >
            <Icon className={cn("h-4 w-4", primary ? "size-5 text-white" : active ? "text-accent" : "text-ink-muted")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
