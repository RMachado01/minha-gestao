"use client";

import {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  PiggyBank,
  CreditCard,
  Receipt,
  Repeat,
  CalendarClock,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

import { BentoGrid } from "@/components/ui/BentoGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { KpiCard } from "@/components/ui/KpiCard";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AnimatedValue } from "@/components/ui/AnimatedValue";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { CHART } from "@/components/charts/chartTheme";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

import { formatBRL, formatBRLCompact, formatPercent } from "@/lib/format";
import {
  overviewKpis,
  saldoHistorico,
  proximosVencimentos,
  type Vencimento,
} from "@/lib/data/empty";

/* ---------- Vencimentos: metadados por tipo ---------- */

const TIPO_META: Record<
  Vencimento["tipo"],
  { Icon: typeof CreditCard; label: string; chip: string; destaque: boolean }
> = {
  cartao: {
    Icon: CreditCard,
    label: "Cartão",
    chip: "text-warn bg-[color-mix(in_oklab,var(--color-warn)_16%,transparent)]",
    destaque: true,
  },
  conta: {
    Icon: Receipt,
    label: "Conta",
    chip: "text-accent-2 bg-[color-mix(in_oklab,var(--color-accent-2)_16%,transparent)]",
    destaque: true,
  },
  assinatura: {
    Icon: Repeat,
    label: "Assinatura",
    chip: "text-accent bg-[color-mix(in_oklab,var(--color-accent)_16%,transparent)]",
    destaque: false,
  },
};

/** Dias até o vencimento (dd/mm) relativo a hoje. */
function diasAte(vence: string): number {
  const [dia, mes] = vence.split("/").map(Number);
  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  let alvo = new Date(hoje.getFullYear(), mes - 1, dia);
  const seisMeses = 1000 * 60 * 60 * 24 * 182;
  if (alvo.getTime() - inicioHoje.getTime() < -seisMeses) {
    alvo = new Date(hoje.getFullYear() + 1, mes - 1, dia);
  }
  return Math.round((alvo.getTime() - inicioHoje.getTime()) / (1000 * 60 * 60 * 24));
}

function statusVenc(dias: number): { label: string; cls: string; Icon: typeof CalendarClock } {
  if (dias < 0) return { label: "Vencido", cls: "text-neg", Icon: AlertTriangle };
  if (dias === 0) return { label: "Vence hoje", cls: "text-warn", Icon: AlertTriangle };
  if (dias <= 3) return { label: `Em ${dias} dia${dias > 1 ? "s" : ""}`, cls: "text-warn", Icon: CalendarClock };
  return { label: `Em ${dias} dias`, cls: "text-ink-muted", Icon: CalendarClock };
}

/* ---------- Página ---------- */

export default function VisaoGeralPage() {
  const saldos = saldoHistorico.map((p) => Number(p.saldo));

  if (saldos.length === 0 && proximosVencimentos.length === 0) {
    return (
      <div className="flex flex-col gap-5 py-2">
        <PageHeader eyebrow="Painel financeiro" title="Visão geral" description="Saldo, movimentações e próximos compromissos em um único lugar." />
        <EmptyState
          icon={Wallet}
          title="Sua conta está pronta"
          description="Você ainda não possui movimentações. Faça o primeiro lançamento para começar a formar seu saldo, gráficos e indicadores."
          actionLabel="Criar primeiro lançamento"
          actionHref="/lancamentos"
        />
      </div>
    );
  }

  const menor = Math.min(...saldos);
  const maior = Math.max(...saldos);
  const totalVencimentos = proximosVencimentos.reduce((acc, v) => acc + v.valor, 0);

  return (
    <div className="flex flex-col gap-5 py-2">
      <PageHeader eyebrow="Painel financeiro" title="Visão geral" description="Saldo, movimentações e próximos compromissos em um único lugar." />
      <BentoGrid>
        {/* ---------- HERO: Saldo do mês ---------- */}
        <GlassCard
          variant="hero"
          className="col-span-12 flex flex-col gap-6 lg:col-span-8"
        >
          <span className="hero-orb -right-16 -top-16 h-72 w-72" aria-hidden="true" />
          <span className="hero-orb hero-orb-2 -bottom-20 left-1/3 h-64 w-64" aria-hidden="true" />
          <section aria-labelledby="hero-saldo" className="flex h-full flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="hero-saldo"
                  className="text-xs font-medium uppercase tracking-[0.2em] text-ink-muted"
                >
                  Saldo do mês
                </h2>
                <p className="mt-1 text-sm text-ink-soft">Julho de 2026</p>
              </div>
              <span className="grid size-11 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--color-pos)_14%,transparent)] text-pos">
                <Wallet className="h-5 w-5" strokeWidth={2} />
              </span>
            </div>

            <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
              <p
                aria-label={`Saldo do mês: ${formatBRL(overviewKpis.saldoMes)}`}
                className="tnum bg-gradient-to-br from-[var(--color-ink)] to-[var(--color-pos)] bg-clip-text text-[2.75rem] font-semibold leading-none tracking-tight text-transparent sm:text-6xl"
              >
                <AnimatedValue target={overviewKpis.saldoMes} format={formatBRL} durationMs={900} />
              </p>
              <TrendBadge value={overviewKpis.trendSaldo} />
            </div>

            <p className="max-w-md text-sm text-ink-soft">
              Saldo positivo e em alta:{" "}
              <span className="tnum font-medium text-pos">
                {formatPercent(overviewKpis.trendSaldo, true)}
              </span>{" "}
              frente ao mês anterior.
            </p>

            {/* Mini-gráfico de tendência — últimos 12 meses */}
            <div className="mt-auto">
              <div className="mb-2 flex items-center justify-between text-xs text-ink-muted">
                <span>Evolução · últimos 12 meses</span>
                <span className="tnum">
                  Menor {formatBRLCompact(menor)} · Maior {formatBRLCompact(maior)}
                </span>
              </div>
              <TrendLineChart
                data={saldoHistorico}
                xKey="periodo"
                series={[{ key: "saldo", label: "Saldo", color: CHART.pos, area: true }]}
                minimal
                height={150}
              />
              <div className="tnum mt-1 flex justify-between text-[11px] text-ink-muted">
                <span>{saldoHistorico[0].periodo}</span>
                <span>{saldoHistorico[saldoHistorico.length - 1].periodo}</span>
              </div>
            </div>
          </section>
        </GlassCard>

        {/* ---------- Rail de KPIs ---------- */}
        <section
          aria-label="Indicadores do mês"
          className="col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-4 lg:grid-cols-1"
        >
          <KpiCard
            label="Entradas"
            value={formatBRL(overviewKpis.entradas)}
            numericValue={overviewKpis.entradas}
            formatValue={formatBRL}
            trend={overviewKpis.trendEntradas}
            tone="pos"
            icon={<ArrowUpCircle className="h-4 w-4" />}
            hint="Renda fixa + variável"
            className="h-full"
          />
          <KpiCard
            label="Saídas"
            value={formatBRL(overviewKpis.saidas)}
            numericValue={overviewKpis.saidas}
            formatValue={formatBRL}
            trend={overviewKpis.trendSaidas}
            tone="neg"
            invertTrend
            icon={<ArrowDownCircle className="h-4 w-4" />}
            hint="Gastos fixos + variáveis"
            className="h-full"
          />
          <KpiCard
            label="Economia"
            value={formatPercent(overviewKpis.economiaPct)}
            numericValue={overviewKpis.economiaPct}
            formatValue={formatPercent}
            decimals={3}
            trend={overviewKpis.trendEconomia}
            tone="pos"
            icon={<PiggyBank className="h-4 w-4" />}
            hint="Do total de entradas"
            className="h-full"
          />
        </section>

        {/* ---------- Próximos vencimentos ---------- */}
        <GlassCard variant="liquid" className="col-span-12">
          <section aria-labelledby="venc-titulo">
            <SectionHeader
              title="Próximos vencimentos"
              subtitle="Faturas, contas e assinaturas a pagar neste mês"
              action={
                <div className="flex items-center gap-3">
                  <span className="hidden text-right sm:block">
                    <span className="block text-[11px] uppercase tracking-wide text-ink-muted">
                      Total
                    </span>
                    <span className="tnum text-sm font-semibold text-neg">
                      {formatBRL(totalVencimentos)}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-[var(--color-line-strong)] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  >
                    Ver extrato
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              }
            />

            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-sm">
                <caption className="sr-only">
                  Lista de próximos vencimentos com descrição, categoria, valor e data
                </caption>
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-ink-muted">
                    <th scope="col" className="px-3 pb-3 font-medium">Descrição</th>
                    <th scope="col" className="hidden px-3 pb-3 font-medium sm:table-cell">Categoria</th>
                    <th scope="col" className="px-3 pb-3 text-right font-medium">Valor</th>
                    <th scope="col" className="px-3 pb-3 text-right font-medium">Vencimento</th>
                  </tr>
                </thead>
                <tbody>
                  {proximosVencimentos.map((v) => {
                    const meta = TIPO_META[v.tipo];
                    const dias = diasAte(v.vence);
                    const status = statusVenc(dias);
                    const { Icon } = meta;
                    const StatusIcon = status.Icon;
                    return (
                      <tr
                        key={`${v.descricao}-${v.vence}`}
                        className={`group border-t border-[var(--color-line)] transition-colors hover:bg-white/[0.035] focus-within:bg-white/[0.05] ${
                          meta.destaque ? "bg-white/[0.015]" : ""
                        }`}
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`grid size-9 shrink-0 place-items-center rounded-xl ${meta.chip}`}
                            >
                              <Icon className="h-4 w-4" strokeWidth={2} />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink">{v.descricao}</p>
                              <p className="text-xs text-ink-muted sm:hidden">{v.categoria}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-3 py-3 sm:table-cell">
                          <span className="inline-flex items-center rounded-full border border-[var(--color-line)] px-2.5 py-0.5 text-xs text-ink-soft">
                            {v.categoria}
                          </span>
                        </td>
                        <td className="tnum px-3 py-3 text-right font-semibold text-neg">
                          − {formatBRL(v.valor)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="tnum text-sm font-medium text-ink">{v.vence}</span>
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-medium ${status.cls}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </GlassCard>
      </BentoGrid>
    </div>
  );
}
