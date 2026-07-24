"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BunnyMark } from "@/components/ui/BunnyMark";
import { NAV_GROUPS, NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/cn";
import { UserAvatar } from "./UserAvatar";
import { useUberMode } from "@/lib/useUberMode";
import { SignOutButton } from "@/components/auth/SignOutButton";

/** Sidebar vertical (desktop). Escondida abaixo de lg — ver MobileNav. */
export function Sidebar() {
  const pathname = usePathname();
  const { isUber } = useUberMode();
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.uberOnly && !isUber) return false;
    if (item.garagemOnly && isUber) return false;
    return true;
  });

  return (
    <aside className="shell-glass sticky top-0 hidden h-dvh w-[17rem] shrink-0 flex-col rounded-none border-y-0 border-l-0 p-5 lg:flex">
      <div className="mb-7 flex items-center gap-3 px-1 pt-1">
        <span className="grid h-10 w-10 place-items-center rounded-[.8rem] bg-accent text-white shadow-[0_12px_28px_-18px_var(--color-accent)]">
          <BunnyMark className="h-[1.35rem] w-[1.35rem]" />
        </span>
        <div className="leading-tight">
          <p className="text-[.95rem] font-semibold tracking-[-.025em] text-ink">Minha Gestão</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[.13em] text-ink-muted">Quiet finance</p>
        </div>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1" aria-label="Navegação principal">
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="mb-2">
            {group.label && (
              <p className="mb-2 mt-1 px-3 text-[9px] font-bold uppercase tracking-[.18em] text-ink-muted">
                {group.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {visibleItems.filter((item) => item.group === group.id).map(
                ({ href, label, icon: Icon }) => {
                  const active =
                    href === "/" ? pathname === "/" : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      data-tour-desktop={href === "/" ? "overview" : href === "/cartoes" ? "cards" : href === "/metas" ? "goals" : href === "/configuracoes" ? "settings" : undefined}
                      className={cn(
                        "group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-[.8125rem] font-medium transition-[background,color,box-shadow] duration-150",
                        active
                          ? "bg-[color-mix(in_oklab,var(--color-accent)_13%,transparent)] text-ink shadow-[inset_2px_0_0_var(--color-accent)]"
                          : "text-ink-soft hover:bg-[color-mix(in_oklab,var(--color-ink)_5%,transparent)] hover:text-ink",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4.5 w-4.5 transition-colors",
                          active
                            ? "text-accent"
                            : "text-ink-muted group-hover:text-ink-soft",
                        )}
                      />
                      {label}
                    </Link>
                  );
                },
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* User avatar area */}
      <div className="mt-auto border-t border-[var(--color-line)] pt-3">
        <Link
          href="/configuracoes"
          className="flex min-h-12 items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[color-mix(in_oklab,var(--color-ink)_5%,transparent)]"
        >
          <UserAvatar size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">Minha conta</p>
            <p className="text-[11px] text-ink-muted">Conta e preferências</p>
          </div>
        </Link>
        <SignOutButton className="mt-1" />
      </div>
    </aside>
  );
}
