"use client";

import { useMemo } from "react";
import Link from "next/link";
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
  Goal,
  LoaderCircle,
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
import { DailyBriefing } from "@/components/advisor/DailyBriefing";

import { formatBRL, formatBRLCompact, formatPercent } from "@/lib/format";
import { useFinanceSummary } from "@/lib/supabase/useFinanceSummary";
import { useCreditCards } from "@/lib/supabase/useCreditCards";
import { useUpcomingBills, nextOccurrence, formatDia } from "@/lib/supabase/useUpcomingBills";
import { useGoalsTeaser } from "@/lib/supabase/useGoalsTeaser";
import type { Vencimento } from "@/lib/mock/overview";

const MONTH_YEAR = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

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
  const { loading, error, fluxoKpis, fluxoAnual } = useFinanceSummary();
  const { cards, loading: loadingCards } = useCreditCards();
  const { items: recorrencias, loading: loadingBills } = useUpcomingBills();
  const { goal, activeCount: activeGoals, loading: loadingGoals } = useGoalsTeaser();

  const saldoHistorico = fluxoAnual;
  const saldos = saldoHistorico.map((p) => Number(p.saldo));

  const cardVencimentos: Vencimento[] = useMemo(() => {
    const now = new Date();
    return cards
      .filter((card) => card.card_type === "credit" && card.current_bill > 0)
      .map((card) => ({
        descricao: `Fatura ${card.nickname}`,
        categoria: "Cartão",
        valor: card.current_bill,
        vence: formatDia(nextOccurrence(card.due_day, now)),
        tipo: "cartao" as const,
      }));
  }, [cards]);

  const proximosVencimentos = useMemo(
    () => [...cardVencimentos, ...recorrencias].sort((a, b) => diasAte(a.vence) - diasAte(b.vence)),
    [cardVencimentos, recorrencias],
  );

  const totalLimite = cards.reduce((sum, card) => sum + (card.card_type === "credit" ? card.total_limit : 0), 0);
  const totalUsado = cards.reduce((sum, card) => sum + (card.card_type === "credit" ? card.current_bill : 0), 0);
  const usoCartoes = totalLimite > 0 ? totalUsado / totalLimite : 0;

  const isLoading = loading || loadingCards || loadingBills || loadingGoals;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 py-2">
        <PageHeader eyebrow="Painel financeiro" title="Visão geral" description="Saldo, movimentações e próximos compromissos em um único lugar." />
        <p className="flex items-center gap-2 text-sm text-ink-muted"><LoaderCircle className="size-4 animate-spin" />Carregando sua visão geral...</p>
      </div>
    );
  }

  const semDados = error || (saldos.every((v) => v === 0) && proximosVencimentos.length === 0);

  if (semDados) {
    return (
      <div className="flex flex-col gap-5 py-2">
        <PageHeader eyebrow="Painel financeiro" title="Visão geral" description="Saldo, movimentações e próximos compromissos em um único lugar." />
        <EmptyState
          icon={Wallet}
          title={error || "Sua conta está pronta"}
          description={error ? "Recarregue a página para tentar novamente." : "Você ainda não possui movimentações. Faça o primeiro lançamento para começar a formar seu saldo, gráficos e indicadores."}
          actionLabel={error ? undefined : "Criar primeiro lançamento"}
          actionHref={error ? undefined : "/lancamentos"}
        />
      </div>
    );
  }

  const menor = Math.min(...saldos);
  const maior = Math.max(...saldos);
  const totalVencimentos = proximosVencimentos.reduce((acc, v) => acc + v.valor, 0);
  const metaProgresso = goal && goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;
  const urgentItems = proximosVencimentos.filter((item) => {
    const days = diasAte(item.vence);
    return days >= 0 && days <= 3;
  });
  const urgentTotal = urgentItems.reduce((sum, item) => sum + item.valor, 0);

  return (
    <div className="flex flex-col gap-5 py-2">
      <PageHeader eyebrow="Painel financeiro" title="Visão geral" description="Saldo, movimentações e próximos compromissos em um único lugar." />
      <BentoGrid>
        {/* ---------- HERO: Saldo do mês ---------- */}
        <GlassCard
          variant="hero"
          className="col-span-12 flex flex-col gap-6 overflow-hidden p-6 lg:col-span-8 lg:p-7"
        >
          <section aria-labelledby="hero-saldo" className="flex h-full flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="hero-saldo"
                  className="eyebrow"
                >
                  Saldo do mês
                </h2>
                <p className="mt-2 text-sm capitalize text-ink-soft">{MONTH_YEAR.format(new Date())}</p>
              </div>
              <span className="grid size-11 place-items-center rounded-xl border border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-pos)_9%,var(--color-surface))] text-pos">
                <Wallet className="h-5 w-5" strokeWidth={2} />
              </span>
            </div>

            <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
              <p
                aria-label={`Saldo do mês: ${formatBRL(fluxoKpis.saldo)}`}
                className="tnum min-w-0 shrink break-words text-[2.75rem] font-semibold leading-none tracking-[-.055em] text-ink sm:text-6xl"
              >
                <AnimatedValue target={fluxoKpis.saldo} format={formatBRL} durationMs={900} />
              </p>
              <TrendBadge value={fluxoKpis.trendSaldo} className="shrink-0" />
            </div>

            <p className="max-w-lg text-sm leading-6 text-ink-soft">
              {fluxoKpis.trendSaldo >= 0 ? "Saldo em alta" : "Saldo em queda"}:{" "}
              <span className={`tnum font-medium ${fluxoKpis.trendSaldo >= 0 ? "text-pos" : "text-neg"}`}>
                {formatPercent(fluxoKpis.trendSaldo, true)}
              </span>{" "}
              frente ao mês anterior.
            </p>

            {/* Mini-gráfico de tendência — últimos 12 meses */}
            <div className="mt-auto">
              <div className="mb-2 flex items-center justify-between text-xs text-ink-muted">
                <span>Evolução · {new Date().getFullYear()}</span>
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

        <DailyBriefing
          balance={fluxoKpis.saldo}
          savingsRate={fluxoKpis.economiaPct}
          balanceTrend={fluxoKpis.trendSaldo}
          urgentBills={urgentItems.length}
          urgentTotal={urgentTotal}
          cardUsage={usoCartoes}
          hasGoal={Boolean(goal)}
        />

        {/* ---------- Indicadores de apoio ---------- */}
        <section
          aria-label="Indicadores do mês"
          className="col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <KpiCard
            label="Entradas"
            value={formatBRL(fluxoKpis.entradas)}
            numericValue={fluxoKpis.entradas}
            formatValue={formatBRL}
            trend={fluxoKpis.trendEntradas}
            tone="pos"
            icon={<ArrowUpCircle className="h-4 w-4" />}
            hint="Renda fixa + variável"
            className="h-full"
          />
          <KpiCard
            label="Saídas"
            value={formatBRL(fluxoKpis.saidas)}
            numericValue={fluxoKpis.saidas}
            formatValue={formatBRL}
            trend={fluxoKpis.trendSaidas}
            tone="neg"
            invertTrend
            icon={<ArrowDownCircle className="h-4 w-4" />}
            hint="Gastos fixos + variáveis"
            className="h-full"
          />
          <KpiCard
            label="Economia"
            value={formatPercent(fluxoKpis.economiaPct)}
            numericValue={fluxoKpis.economiaPct}
            formatValue={formatPercent}
            decimals={3}
            trend={fluxoKpis.trendEconomia}
            tone="pos"
            icon={<PiggyBank className="h-4 w-4" />}
            hint="Do total de entradas"
            className="h-full"
          />
        </section>

        {/* ---------- Destaques: metas e cartões ---------- */}
        <Link href="/metas" className="col-span-12 sm:col-span-6">
          <GlassCard variant="default" interactive className="h-full">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink-soft">Sonhos e metas</span>
              <span className="grid size-9 place-items-center rounded-xl text-accent-2 bg-[color-mix(in_oklab,var(--color-accent-2)_16%,transparent)]">
                <Goal className="h-4 w-4" strokeWidth={2} />
              </span>
            </div>
            {goal ? (
              <>
                <p className="tnum mt-3 text-2xl font-semibold text-ink">{formatPercent(metaProgresso)}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {goal.name} · {formatBRL(goal.currentAmount)} de {formatBRL(goal.targetAmount)}
                </p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <div className="h-full rounded-full bg-accent-2" style={{ width: `${Math.min(metaProgresso * 100, 100)}%` }} />
                </div>
                {activeGoals > 1 && <p className="mt-2 text-xs text-ink-muted">+{activeGoals - 1} outra{activeGoals - 1 > 1 ? "s" : ""} meta ativa{activeGoals - 1 > 1 ? "s" : ""}</p>}
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">Nenhuma meta ativa. Crie um sonho para acompanhar o progresso aqui.</p>
            )}
          </GlassCard>
        </Link>

        <Link href="/cartoes" className="col-span-12 sm:col-span-6">
          <GlassCard variant="default" interactive className="h-full">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink-soft">Cartões de crédito</span>
              <span className="grid size-9 place-items-center rounded-xl text-warn bg-[color-mix(in_oklab,var(--color-warn)_16%,transparent)]">
                <CreditCard className="h-4 w-4" strokeWidth={2} />
              </span>
            </div>
            {cards.some((card) => card.card_type === "credit") ? (
              <>
                <p className="tnum mt-3 text-2xl font-semibold text-ink">{formatPercent(usoCartoes)}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {formatBRL(totalUsado)} usados de {formatBRL(totalLimite)}
                </p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <div className="h-full rounded-full bg-warn" style={{ width: `${Math.min(usoCartoes * 100, 100)}%` }} />
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">Nenhum cartão cadastrado ainda.</p>
            )}
          </GlassCard>
        </Link>

        {/* ---------- Próximos vencimentos ---------- */}
        <GlassCard variant="default" className="col-span-12">
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
                  <Link
                    href="/transacoes"
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-[var(--color-line-strong)] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  >
                    Ver extrato
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              }
            />

            {proximosVencimentos.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-muted">Nenhum vencimento cadastrado — cartões e recorrências aparecem aqui automaticamente.</p>
            ) : (
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
            )}
          </section>
        </GlassCard>
      </BentoGrid>
    </div>
  );
}
