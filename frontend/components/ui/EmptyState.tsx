import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Inbox } from "lucide-react";
import { GlassCard } from "./GlassCard";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  /** Navega para uma rota (ex.: "/lancamentos"). */
  actionHref?: string;
  /** Ação na própria página (ex.: abrir um dialog de cadastro). */
  actionOnClick?: () => void;
  icon?: LucideIcon;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  icon: Icon = Inbox,
}: EmptyStateProps) {
  return (
    <GlassCard variant="hero" className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--color-accent)_16%,transparent)] text-accent">
        <Icon className="size-6" />
      </span>
      <h2 className="mt-5 text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-ink-soft">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary mt-6">
          {actionLabel}
          <ArrowRight className="size-4" />
        </Link>
      )}
      {actionLabel && !actionHref && actionOnClick && (
        <button type="button" onClick={actionOnClick} className="btn-primary mt-6">
          {actionLabel}
          <ArrowRight className="size-4" />
        </button>
      )}
    </GlassCard>
  );
}
