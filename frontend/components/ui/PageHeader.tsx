import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <header className="flex flex-wrap items-end justify-between gap-4"><div>{eyebrow && <p className="text-xs font-semibold uppercase tracking-[.16em] text-accent">{eyebrow}</p>}<h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1><p className="mt-1.5 max-w-2xl text-sm text-ink-muted">{description}</p></div>{action}</header>;
}
