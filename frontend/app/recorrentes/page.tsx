"use client";

import { useState } from "react";
import { Repeat, Tv, CreditCard, Home, Banknote, Settings2, type LucideIcon } from "lucide-react";

import { BentoGrid } from "@/components/ui/BentoGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { RecurrenceManageDialog } from "@/components/recurrences/RecurrenceManageDialog";
import { RaiseCelebration } from "@/components/ui/RaiseCelebration";

import { useRecurrences, type RecurrenceRule, type RecurrenceType } from "@/lib/supabase/useRecurrences";
import { detectSubscriptionBrand } from "@/lib/subscriptions";
import { formatBRL } from "@/lib/format";

type Filtro = "todas" | "subscription" | "installment" | "fixed_bill" | "income";

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "income", label: "Rendas" },
  { key: "subscription", label: "Assinaturas" },
  { key: "installment", label: "Parcelas" },
  { key: "fixed_bill", label: "Contas fixas" },
];

const TIPO_BADGE: Record<RecurrenceType, { label: string; className: string }> = {
  subscription: { label: "Assinatura", className: "bg-purple-500/15 text-purple-400" },
  installment: { label: "Parcela", className: "bg-blue-500/15 text-blue-400" },
  fixed_bill: { label: "Conta fixa", className: "bg-slate-500/15 text-slate-400" },
  income: { label: "Renda", className: "bg-emerald-500/15 text-emerald-400" },
};

/** Ícone + cor de marca para o avatar de fallback de cada tipo de recorrência. */
const TIPO_AVATAR: Record<RecurrenceType, { icon: LucideIcon; color: string }> = {
  subscription: { icon: Tv, color: "#a855f7" },
  installment: { icon: CreditCard, color: "#3b82f6" },
  fixed_bill: { icon: Home, color: "#64748b" },
  income: { icon: Banknote, color: "#10b981" },
};

export default function RecorrentesPage() {
  const { items, loading, error, refresh } = useRecurrences();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [managedRule, setManagedRule] = useState<RecurrenceRule | null>(null);
  const [celebration, setCelebration] = useState("");

  const despesas = items.filter((r) => r.type !== "income");
  const rendas = items.filter((r) => r.type === "income");
  const totalMensal = despesas.filter((r) => r.active).reduce((s, r) => s + r.amount, 0);
  const totalRenda = rendas.filter((r) => r.active).reduce((s, r) => s + r.amount, 0);
  const assinaturas = items.filter((r) => r.type === "subscription");
  const parcelas = items.filter((r) => r.type === "installment");
  const contasFixas = items.filter((r) => r.type === "fixed_bill");

  const itens = filtro === "todas" ? items : items.filter((r) => r.type === filtro);

  return (
    <section aria-labelledby="recorrentes-heading" className="gz-page flex flex-col gap-6">
      <style>{gzKeyframes}</style>

      <h2 id="recorrentes-heading" className="sr-only">
        Recorrentes
      </h2>

      <PageHeader
        eyebrow="Finanças"
        title="Recorrentes"
        description="Gerencie assinaturas, parcelas, contas fixas e rendas que se repetem mensalmente."
      />

      {error && <div role="alert" className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-neg">{error}</div>}

      {/* KPIs */}
      <BentoGrid>
        <KpiCard
          className="gz-rise col-span-12 sm:col-span-6 lg:col-span-3"
          style={{ animationDelay: "0ms" }}
          label="Total mensal comprometido"
          value={formatBRL(totalMensal)}
          tone="neutral"
          icon={<Repeat className="h-4 w-4" strokeWidth={2} />}
          hint="Soma das despesas recorrentes ativas"
        />
        <KpiCard
          className="gz-rise col-span-12 sm:col-span-6 lg:col-span-3"
          style={{ animationDelay: "60ms" }}
          label="Renda recorrente mensal"
          value={formatBRL(totalRenda)}
          tone="pos"
          icon={<Banknote className="h-4 w-4" strokeWidth={2} />}
          hint="Salário e outras rendas fixas ativas"
        />
        <KpiCard
          className="gz-rise col-span-12 sm:col-span-6 lg:col-span-3"
          style={{ animationDelay: "120ms" }}
          label="Assinaturas ativas"
          value={String(assinaturas.filter((r) => r.active).length)}
          tone="neutral"
          icon={<Tv className="h-4 w-4" strokeWidth={2} />}
          hint="Serviços recorrentes sem prazo"
        />
        <KpiCard
          className="gz-rise col-span-12 sm:col-span-6 lg:col-span-3"
          style={{ animationDelay: "180ms" }}
          label="Parcelas em andamento"
          value={String(parcelas.filter((r) => r.active).length)}
          tone="neutral"
          icon={<CreditCard className="h-4 w-4" strokeWidth={2} />}
          hint="Compras parceladas ativas"
        />
        <KpiCard
          className="gz-rise col-span-12 sm:col-span-6 lg:col-span-3"
          style={{ animationDelay: "240ms" }}
          label="Contas fixas"
          value={String(contasFixas.filter((r) => r.active).length)}
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
        style={{ animationDelay: "300ms" }}
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
        style={{ animationDelay: "360ms" }}
      >
        <div className="divide-y divide-[var(--color-line)]">
          {itens.map((item) => (
            <RecorrenciaRow key={item.id} item={item} onManage={() => setManagedRule(item)} />
          ))}
        </div>

        {!loading && itens.length === 0 && (
          <p className="py-12 text-center text-sm text-ink-muted">
            {items.length === 0 ? "Nenhuma recorrência cadastrada ainda. Crie uma em Novo lançamento, marcando como recorrente." : "Nenhuma recorrência nesta categoria."}
          </p>
        )}
      </GlassCard>

      <RecurrenceManageDialog
        rule={managedRule}
        onClose={() => setManagedRule(null)}
        onChanged={refresh}
        onRaise={setCelebration}
      />
      <RaiseCelebration visible={celebration !== ""} message={celebration} onClose={() => setCelebration("")} />
    </section>
  );
}

function RecorrenciaRow({ item, onManage }: { item: RecurrenceRule; onManage: () => void }) {
  const badge = TIPO_BADGE[item.type];
  const isInstallment = item.type === "installment" && item.current_installment != null && item.total_installments != null;
  const progress = isInstallment ? (item.current_installment! / item.total_installments!) : 0;

  // Qualquer recorrência cuja descrição contenha uma marca conhecida
  // (Spotify, Netflix, iFood…) ganha o logo real do serviço, independente do
  // tipo; quando não há marca reconhecida, usa o ícone do tipo.
  const brand = detectSubscriptionBrand(item.description);
  const avatar = TIPO_AVATAR[item.type];
  const AvatarIcon = avatar.icon;

  return (
    <div
      className={`flex items-center justify-between gap-4 py-4 transition-opacity ${
        item.active ? "opacity-100" : "opacity-50"
      }`}
    >
      {/* Left: logo/ícone da marca + descrição + categoria */}
      <div className="flex min-w-0 items-center gap-3">
        {brand ? (
          <BrandLogo label={brand.label} domain={brand.domain} color={brand.color} textColor={brand.textColor} size={40} />
        ) : (
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-xl"
            style={{
              background: `color-mix(in oklab, ${avatar.color} 16%, transparent)`,
              color: avatar.color,
              boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${avatar.color} 30%, transparent)`,
            }}
          >
            <AvatarIcon className="size-[18px]" strokeWidth={2} />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{item.description}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>
              {badge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Center: valor + parcela */}
      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <span className={`tnum text-sm font-semibold ${item.type === "income" ? "text-pos" : "text-ink"}`}>
          {formatBRL(item.amount)}
          {!isInstallment && <span className="ml-1 text-xs font-normal text-ink-soft">/ mês</span>}
        </span>
        {isInstallment && (
          <div className="flex items-center gap-2">
            <span className="tnum text-xs text-ink-muted">
              {item.current_installment}/{item.total_installments}
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

      {/* Right: dia do mês + status + gerenciar */}
      <div className="flex shrink-0 items-center gap-3">
        <span className="tnum text-xs text-ink-soft">dia {item.day_of_month}</span>
        {item.active ? (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
            Ativo
          </span>
        ) : (
          <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[11px] font-medium text-slate-400">
            Pausado
          </span>
        )}
        <button
          type="button"
          onClick={onManage}
          className="grid size-8 shrink-0 place-items-center rounded-xl border border-[var(--color-line)] text-ink-soft hover:text-ink"
          aria-label={`Gerenciar recorrência ${item.description}`}
        >
          <Settings2 className="size-3.5" />
        </button>
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
