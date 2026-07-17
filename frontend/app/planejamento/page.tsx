"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, AlertTriangle, CheckCircle2, Clock, Ban, LoaderCircle } from "lucide-react";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import type { ContaPlanejada } from "@/lib/data/empty";
import { formatDateBR } from "@/lib/format";
import { formatBRL } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

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

interface DbTransaction {
  id: string;
  description: string;
  amount: number | string;
  occurred_on: string;
  category: string;
  status: "pending" | "paid" | "received";
  recurring: boolean;
  installments_total: number | null;
  current_installment: number | null;
  credit_card_id: string | null;
}

function planningStatus(item: DbTransaction): ContaPlanejada["status"] {
  if (item.status === "paid") return "pago";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${item.occurred_on}T00:00:00`);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "atrasado";
  if (days <= 7) return "vence_breve";
  if (days <= 31) return "agendado";
  return "previsto";
}

function toPlanningItem(item: DbTransaction): ContaPlanejada {
  return {
    id: item.id,
    descricao: item.description,
    valor: Number(item.amount),
    vencimento: item.occurred_on,
    categoria: item.category,
    tipo: item.credit_card_id
      ? "cartao"
      : item.installments_total
        ? "parcela"
        : item.recurring
          ? "assinatura"
          : "conta",
    status: planningStatus(item),
    recorrente: item.recurring,
    parcela: item.installments_total
      ? `${item.current_installment ?? 1}/${item.installments_total}`
      : null,
  };
}

/* ─── Page ─── */

export default function PlanejamentoPage() {
  const { toast } = useToast();
  const [contasPlanejadas, setContasPlanejadas] = useState<ContaPlanejada[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadPlanning = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setLoading(false);
      return;
    }
    const start = new Date();
    start.setDate(start.getDate() - 90);
    const end = new Date();
    end.setMonth(end.getMonth() + 6);
    const { data, error: loadError } = await supabase
      .from("transactions")
      .select("id,description,amount,occurred_on,category,status,recurring,installments_total,current_installment,credit_card_id")
      .in("type", ["expense", "benefit"])
      .gte("occurred_on", start.toISOString().slice(0, 10))
      .lte("occurred_on", end.toISOString().slice(0, 10))
      .order("occurred_on", { ascending: true });
    if (loadError) setError("Não foi possível carregar o planejamento.");
    else setContasPlanejadas(((data ?? []) as DbTransaction[]).map(toPlanningItem));
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadPlanning(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPlanning]);

  const byStatus = useCallback(
    (status: ContaPlanejada["status"]) => contasPlanejadas.filter((item) => item.status === status),
    [contasPlanejadas],
  );
  const totalPrevisto = useMemo(() =>
    contasPlanejadas
      .filter((c) => c.status !== "pago")
      .reduce((s, c) => s + c.valor, 0), [contasPlanejadas]);
  const totalPago = useMemo(() => {
    const now = new Date();
    return contasPlanejadas
      .filter((item) => {
        if (item.status !== "pago") return false;
        const paidDate = new Date(`${item.vencimento}T00:00:00`);
        return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, item) => sum + item.valor, 0);
  }, [contasPlanejadas]);
  const venceBreveCount = byStatus("vence_breve").length;
  const atrasados = byStatus("atrasado");
  const atrasadoCount = atrasados.length;
  const atrasadoSum = atrasados.reduce((s, c) => s + c.valor, 0);

  async function markAsPaid(id: string) {
    const supabase = createClient();
    if (!supabase) return;
    setUpdatingId(id);
    const { error: updateError } = await supabase
      .from("transactions")
      .update({ status: "paid" })
      .eq("id", id);
    if (updateError) toast("Não foi possível marcar a conta como paga.", "error");
    else {
      setContasPlanejadas((current) => current.map((item) => item.id === id ? { ...item, status: "pago" } : item));
      toast("Conta marcada como paga", "success");
    }
    setUpdatingId(null);
  }

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

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-rose-400/10 p-4 text-sm text-neg">
          <span>{error}</span>
          <button type="button" className="rounded-xl border border-rose-400/20 px-3 py-2 font-semibold transition hover:bg-rose-400/10" onClick={() => void loadPlanning()}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* ─── Kanban ─── */}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-ink-muted"><LoaderCircle className="size-4 animate-spin" />Carregando planejamento...</div>
      ) : <div className="flex gap-4 overflow-x-auto pb-4">
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
                    {col.key !== "pago" && (
                      <button type="button" onClick={() => void markAsPaid(item.id)} disabled={updatingId === item.id} className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 text-xs font-semibold text-pos transition hover:bg-emerald-400/10 disabled:opacity-60">
                        {updatingId === item.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                        Marcar como paga
                      </button>
                    )}
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
      </div>}
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
