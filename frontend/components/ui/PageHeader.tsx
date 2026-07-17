import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <header className="flex flex-wrap items-end justify-between gap-5 py-1"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 className="display-font mt-1.5 text-[2rem] font-medium leading-none tracking-[-.025em] text-ink sm:text-[2.5rem]">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">{description}</p></div>{action}</header>;
}
