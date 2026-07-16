"use client";

import { Calendar, AlertTriangle, CheckCircle2, Clock, Ban } from "lucide-react";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { contasPlanejadas, type ContaPlanejada } from "@/lib/data/empty";
import { formatDateBR } from "@/lib/format";
import { formatBRL } from "@/lib/format";

/* ─── Column definitions ─── */

interface Column {
  key: ContaPlanejada["status"];
  label: string;
  color: string;
  bg: string;
  dot: string;
  icon: React.ReactNode;
}

const COLUMNS: Column[] = [
  {
    key: "previsto",
    label: "Previsto",
    color: "text-slate-500",
    bg: "bg-slate-500/5",
    dot: "bg-slate-400",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  {
    key: "agendado",
    label: "Agendado",
    color: "text-blue-500",
    bg: "bg-blue-500/5",
    dot: "bg-blue-500",
    icon: <Calendar className="h-3.5 w-3.5" />,
  },
  {
    key: "vence_breve",
    label: "Vence em breve",
    color: "text-amber-500",
    bg: "bg-amber-500/5",
    dot: "bg-amber-500",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  {
    key: "pago",
    label: "Pago",
    color: "text-emerald-500",
    bg: "bg-emerald-500/5",
    dot: "bg-emerald-500",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  {
    key: "atrasado",
    label: "Atrasado",
    color: "text-red-500",
    bg: "bg-red-500/5",
    dot: "bg-red-500",
    icon: <Ban className="h-3.5 w-3.5" />,
  },
];

/* ─── Helpers ─── */

function byStatus(status: ContaPlanejada["status"]) {
  return contasPlanejadas.filter((c) => c.status === status);
}

function sumByStatus(status: ContaPlanejada["status"]) {
  return byStatus(status).reduce((s, c) => s + c.valor, 0);
}

/* ─── Page ─── */

export default function PlanejamentoPage() {
  const totalPrevisto =
    contasPlanejadas
      .filter((c) => c.status !== "pago")
      .reduce((s, c) => s + c.valor, 0);
  const totalPago = sumByStatus("pago");
  const venceBreveCount = byStatus("vence_breve").length;
  const atrasados = byStatus("atrasado");
  const atrasadoCount = atrasados.length;
  const atrasadoSum = atrasados.reduce((s, c) => s + c.valor, 0);

  return (
    <section className="flex flex-col gap-8">
      <style>{gzKeyframes}</style>

      <PageHeader
        eyebrow="Finanças"
        title="Planejamento"
        description="Acompanhe suas contas e compromissos financeiros no fluxo de pagamento."
      />

      {/* ─── KPIs ─── */}
      <BentoGrid>
        <KpiCard
          className="gz-rise col-span-6 sm:col-span-3"
          label="Total previsto"
          value={formatBRL(totalPrevisto)}
          icon={<Clock className="h-4 w-4" />}
        />
        <KpiCard
          className="gz-rise col-span-6 sm:col-span-3"
          label="Pago este mês"
          value={formatBRL(totalPago)}
          tone="pos"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <KpiCard
          className="gz-rise col-span-6 sm:col-span-3"
          label="Vence em breve"
          value={String(venceBreveCount)}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <KpiCard
          className="gz-rise col-span-6 sm:col-span-3"
          label="Atrasado"
          value={`${atrasadoCount} · ${formatBRL(atrasadoSum)}`}
          tone="neg"
          icon={<Ban className="h-4 w-4" />}
        />
      </BentoGrid>

      {/* ─── Kanban ─── */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const items = byStatus(col.key);
          const total = items.reduce((s, c) => s + c.valor, 0);

          return (
            <div
              key={col.key}
              className="gz-rise min-w-[260px] flex-1 rounded-2xl border border-[var(--color-line)] p-3"
            >
              {/* Column header */}
              <div className={`mb-3 flex items-center gap-2 rounded-xl px-2.5 py-2 ${col.bg}`}>
                <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                <span className={`text-xs font-semibold ${col.color}`}>
                  {col.label}
                </span>
                <span className="ml-auto rounded-full bg-[var(--color-surface-raised)] px-2 py-0.5 text-[10px] font-bold text-ink-muted">
                  {items.length}
                </span>
              </div>
              <p className="mb-3 px-1 text-xs text-ink-muted">
                Total: <span className="tnum font-semibold text-ink">{formatBRL(total)}</span>
              </p>

              {/* Cards */}
              <div className="flex flex-col gap-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border border-[var(--color-line)] p-3 text-sm transition-colors hover:border-[var(--color-accent)] ${
                      col.key === "atrasado" ? "bg-red-500/[0.04]" : ""
                    }`}
                  >
                    <p className="font-medium text-ink">{item.descricao}</p>
                    <p className="tnum mt-1 text-base font-semibold text-ink">
                      {formatBRL(item.valor)}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
                      <Calendar className="h-3 w-3" />
                      <span className="tnum">{formatDateBR(item.vencimento, false)}</span>
                      <span className="rounded-full bg-[var(--color-surface-raised)] px-2 py-0.5 text-[10px] font-medium">
                        {item.categoria}
                      </span>
                      {item.parcela && (
                        <span className="ml-auto rounded-full border border-[var(--color-line)] px-2 py-0.5 text-[10px] font-medium text-ink-soft">
                          {item.parcela}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="py-6 text-center text-xs text-ink-muted">
                    Nenhuma conta
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Animation ─── */

const gzKeyframes = `
@keyframes gzRise {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.gz-rise {
  animation: gzRise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
`;
