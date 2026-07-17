"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CreditCard, LayoutDashboard, Menu, Plus, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { NAV_GROUPS, NAV_ITEMS } from "@/lib/nav";
import { useUberMode } from "@/lib/useUberMode";
import { SignOutButton } from "@/components/auth/SignOutButton";

const ITEMS = [
  { href: "/", label: "Início", icon: LayoutDashboard, tour: "overview" },
  { href: "/fluxo-caixa", label: "Fluxo", icon: TrendingUp },
  { href: "/lancamentos", label: "Adicionar", icon: Plus, primary: true, tour: "new-launch" },
  { href: "/cartoes", label: "Cartões", icon: CreditCard, tour: "cards" },
] as const;

/** Barra inferior + catálogo completo mobile. */
export function MobileNav() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { isUber } = useUberMode();
  const [open, setOpen] = useState(false);
  const visibleItems = NAV_ITEMS.filter((item) => (!item.uberOnly || isUber) && (!item.garagemOnly || !isUber));

  useEffect(() => {
    const show = () => setOpen(true);
    const hide = () => setOpen(false);
    window.addEventListener("mg-open-mobile-nav", show);
    window.addEventListener("mg-close-mobile-nav", hide);
    return () => { window.removeEventListener("mg-open-mobile-nav", show); window.removeEventListener("mg-close-mobile-nav", hide); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <nav className="shell-glass fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-[1.25rem] p-1.5 pb-[max(.375rem,env(safe-area-inset-bottom))] lg:hidden" aria-label="Navegação principal">
        {ITEMS.map((item) => {
          const { href, label, icon: Icon } = item;
          const primary = "primary" in item && item.primary;
          const tour = "tour" in item ? item.tour : undefined;
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return <Link key={href} href={href} data-tour-mobile={tour} className={cn("relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-medium transition-colors", primary && "-mt-5 min-h-14 rounded-full bg-accent text-white shadow-[0_14px_32px_-16px_var(--color-accent)]", active ? primary ? "text-white" : "bg-[color-mix(in_oklab,var(--color-accent)_13%,transparent)] text-ink" : "text-ink-soft hover:text-ink")}><Icon className={cn("h-4 w-4", primary ? "size-5 text-white" : active ? "text-accent" : "text-ink-muted")} />{label}</Link>;
        })}
        <button type="button" data-tour-mobile="more" onClick={() => setOpen(true)} className="relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-medium text-ink-soft transition hover:text-ink" aria-label="Abrir todas as funções"><Menu className="size-4 text-ink-muted" />Mais</button>
      </nav>

      <AnimatePresence>
        {open && <motion.div className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.section role="dialog" aria-modal="true" aria-label="Todas as funções" data-lenis-prevent className="liquid-glass-hero absolute inset-x-0 bottom-0 max-h-[86dvh] overflow-y-auto rounded-t-[2rem] p-5 pb-[max(7rem,calc(2rem+env(safe-area-inset-bottom)))]" initial={reduceMotion ? { opacity: 0 } : { y: "100%" }} animate={{ y: 0, opacity: 1 }} exit={reduceMotion ? { opacity: 0 } : { y: "100%" }} transition={{ type: "spring", stiffness: 360, damping: 34 }} onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 mb-4 flex items-center justify-between bg-[var(--color-surface-2)]/90 py-2 backdrop-blur-xl"><div><p className="eyebrow">Navegação</p><h2 className="display-font mt-1 text-2xl font-medium text-ink">Todas as funções</h2></div><button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--color-ink)_5%,transparent)] text-ink-soft" aria-label="Fechar menu"><X className="size-5" /></button></div>
            <div className="space-y-5">
              {NAV_GROUPS.map((group) => {
                const groupItems = visibleItems.filter((item) => item.group === group.id);
                if (!groupItems.length) return null;
                return <div key={group.id}>{group.label && <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-ink-muted">{group.label}</p>}<div className="grid grid-cols-2 gap-2">{groupItems.map(({ href, label, icon: Icon }) => { const active = href === "/" ? pathname === "/" : pathname.startsWith(href); return <Link key={href} href={href} data-tour-mobile={href === "/metas" ? "goals" : href === "/configuracoes" ? "settings" : undefined} onClick={() => setOpen(false)} className={cn("flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-sm font-semibold", active ? "border-accent bg-accent/10 text-ink" : "border-[var(--color-line)] bg-white/[.025] text-ink-soft")}><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/5"><Icon className={cn("size-4", active && "text-accent")} /></span>{label}</Link>; })}</div></div>;
              })}
            </div>
            <SignOutButton className="mt-5" />
          </motion.section>
        </motion.div>}
      </AnimatePresence>
    </>
  );
}
