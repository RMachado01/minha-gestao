"use client";

import { useState } from "react";
import { Repeat, Tv, CreditCard, Home } from "lucide-react";

import { BentoGrid } from "@/components/ui/BentoGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";

import { recorrencias, type RecorrenciaAtiva } from "@/lib/data/empty";
import { formatBRL } from "@/lib/format";

type Filtro = "todas" | "subscription" | "installment" | "fixed_bill";

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "subscription", label: "Assinaturas" },
  { key: "installment", label: "Parcelas" },
  { key: "fixed_bill", label: "Contas fixas" },
];

const TIPO_BADGE: Record<RecorrenciaAtiva["tipo"], { label: string; className: string }> = {
  subscription: { label: "Assinatura", className: "bg-purple-500/15 text-purple-400" },
  installment: { label: "Parcela", className: "bg-blue-500/15 text-blue-400" },
  fixed_bill: { label: "Conta fixa", className: "bg-slate-500/15 text-slate-400" },
};

const TIPO_DOT_COLOR: Record<RecorrenciaAtiva["tipo"], string> = {
  subscription: "bg-purple-400",
  installment: "bg-blue-400",
  fixed_bill: "bg-slate-400",
};

export default function RecorrentesPage() {
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const totalMensal = recorrencias
    .filter((r) => r.ativo)
    .reduce((s, r) => s + r.valor, 0);
  const assinaturas = recorrencias.filter((r) => r.tipo === "subscription");
  const parcelas = recorrencias.filter((r) => r.tipo === "installment");
  const contasFixas = recorrencias.filter((r) => r.tipo === "fixed_bill");

  const itens =
    filtro === "todas"
      ? recorrencias
      : recorrencias.filter((r) => r.tipo === filtro);

  return (
    <section aria-labelledby="recorrentes-heading" className="gz-page flex flex-col gap-6">
      <style>{gzKeyframes}</style>

      <h2 id="recorrentes-heading" className="sr-only">
        Recorrentes
      </h2>

      <PageHeader
        eyebrow="Finanças"
        title="Recorrentes"
        description="Gerencie assinaturas, parcelas e contas fixas que se repetem mensalmente."
      />

      {/* KPIs */}
      <BentoGrid>
        <KpiCard
          className="gz-rise col-span-6 sm:col-span-3"
          style={{ animationDelay: "0ms" }}
          label="Total mensal comprometido"
          value={formatBRL(totalMensal)}
          tone="neutral"
          icon={<Repeat className="h-4 w-4" strokeWidth={2} />}
          hint="Soma das recorrências ativas"
        />
        <KpiCard
          className="gz-rise col-span-6 sm:col-span-3"
          style={{ animationDelay: "60ms" }}
          label="Assinaturas ativas"
          value={String(assinaturas.filter((r) => r.ativo).length)}
          tone="neutral"
          icon={<Tv className="h-4 w-4" strokeWidth={2} />}
          hint="Serviços recorrentes sem prazo"
        />
        <KpiCard
          className="gz-rise col-span-6 sm:col-span-3"
          style={{ animationDelay: "120ms" }}
          label="Parcelas em andamento"
          value={String(parcelas.filter((r) => r.ativo).length)}
          tone="neutral"
          icon={<CreditCard className="h-4 w-4" strokeWidth={2} />}
          hint="Compras parceladas ativas"
        />
        <KpiCard
          className="gz-rise col-span-6 sm:col-span-3"
          style={{ animationDelay: "180ms" }}
          label="Contas fixas"
          value={String(contasFixas.filter((r) => r.ativo).length)}
          tone="neutral"
          icon={<Home className="h-4 w-4" strokeWidth={2} />}
          hint="Contas mensais obrigatórias"
        />
      </BentoGrid>

      {/* Filtros */}
      <div
        className="gz-rise flex flex-wrap gap-2"
        role="group"
        aria-label="Filtrar por tipo"
        style={{ animationDelay: "240ms" }}
      >
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              filtro === f.key
                ? "border-accent bg-accent/10 text-accent"
                : "border-[var(--color-line)] text-ink-soft hover:border-ink-muted hover:text-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de recorrências */}
      <GlassCard
        variant="liquid"
        className="gz-rise col-span-12"
        style={{ animationDelay: "300ms" }}
      >
        <div className="divide-y divide-[var(--color-line)]">
          {itens.map((item) => (
            <RecorrenciaRow key={item.id} item={item} />
          ))}
        </div>

        {itens.length === 0 && (
          <p className="py-12 text-center text-sm text-ink-muted">
            Nenhuma recorrência nesta categoria.
          </p>
        )}
      </GlassCard>
    </section>
  );
}

function RecorrenciaRow({ item }: { item: RecorrenciaAtiva }) {
  const badge = TIPO_BADGE[item.tipo];
  const dotColor = TIPO_DOT_COLOR[item.tipo];
  const isInstallment = item.tipo === "installment" && item.parcelaAtual != null && item.totalParcelas != null;
  const progress = isInstallment ? (item.parcelaAtual! / item.totalParcelas!) : 0;

  return (
    <div
      className={`flex items-center justify-between gap-4 py-4 transition-opacity ${
        item.ativo ? "opacity-100" : "opacity-50"
      }`}
    >
      {/* Left: dot + descrição + categoria */}
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{item.descricao}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>
              {badge.label}
            </span>
            <span className="text-xs text-ink-muted">{item.categoria}</span>
          </div>
        </div>
      </div>

      {/* Center: valor + parcela */}
      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <span className="tnum text-sm font-semibold text-ink">
          {formatBRL(item.valor)}
          {!isInstallment && <span className="ml-1 text-xs font-normal text-ink-soft">/ mês</span>}
        </span>
        {isInstallment && (
          <div className="flex items-center gap-2">
            <span className="tnum text-xs text-ink-muted">
              {item.parcelaAtual}/{item.totalParcelas}
            </span>
            <span
              aria-hidden
              className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10"
            >
              <span
                className="block h-full rounded-full bg-accent transition-[width] duration-500"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </span>
          </div>
        )}
      </div>

      {/* Right: dia do mês + status */}
      <div className="flex shrink-0 items-center gap-3">
        <span className="tnum text-xs text-ink-soft">dia {item.diaDoMes}</span>
        {item.ativo ? (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
            Ativo
          </span>
        ) : (
          <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[11px] font-medium text-slate-400">
            Pausado
          </span>
        )}
      </div>
    </div>
  );
}

const gzKeyframes = `
@keyframes gzRise {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.gz-rise {
  animation: gzRise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
`;
