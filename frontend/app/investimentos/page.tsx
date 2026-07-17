"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LineChart, Wallet, Layers, Banknote, Landmark, Settings2, Radar, BarChart3 } from "lucide-react";

import { BentoGrid } from "@/components/ui/BentoGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { KpiCard } from "@/components/ui/KpiCard";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { CompositionDonut } from "@/components/charts/CompositionDonut";
import { CHART, CATEGORICAL } from "@/components/charts/chartTheme";
import { formatBRL, formatBRLCompact, formatCompactNumber, formatDateBR, formatPercent } from "@/lib/format";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import { INVESTMENT_TYPE_LABEL, useInvestments, type InvestmentPosition } from "@/lib/supabase/useInvestments";
import { InvestmentRegistration } from "@/components/investments/InvestmentRegistration";
import { InvestmentManageDialog } from "@/components/investments/InvestmentManageDialog";
import { InvestorWelcome } from "@/components/investments/InvestorWelcome";
import { useDividendWatchlist, usePortfolioQuotes } from "@/lib/market/useMarketQuotes";

const INCOME_LABEL: Record<string, string> = {
  dividendo: "Dividendo",
  jcp: "JCP",
  rendimento: "Rendimento",
  juros: "Juros",
  outro: "Outro",
};

/** Retorna a classe de cor semântica conforme o sinal do valor. */
function toneClass(value: number): string {
  return value >= 0 ? "text-pos" : "text-neg";
}

/** "há 5 min" / "há 2 h" / "hoje" a partir de um ISO — texto curto de frescor do dado. */
function formatUpdatedAt(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return `há ${days} d`;
}

/** Linhas de esqueleto — um ticker ainda não resolvido por coluna, enquanto o radar carrega aos poucos. */
function SkeletonRows({ count, columns }: { count: number; columns: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, row) => (
        <tr key={`skeleton-${row}`} className="border-b border-[var(--color-line)] last:border-0">
          {Array.from({ length: columns }).map((__, col) => (
            <td key={col} className="py-3 pr-4">
              <div className="h-4 w-full max-w-24 animate-pulse rounded-full bg-white/10" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function InvestimentosPage() {
  const { loading, positions, evolucaoPatrimonial, alocacao, proventosRecentes, kpis, refresh } = useInvestments();
  const [managed, setManaged] = useState<InvestmentPosition | null>(null);

  const alocacaoTotal = alocacao.reduce((acc, s) => acc + s.value, 0);
  const { patrimonio, investido, rentabilidade, ganho, trendMes, proventosMes, proventosTotal } = kpis;

  const carteiraTickers = positions.map((p) => p.ticker).filter((ticker): ticker is string => Boolean(ticker));
  const carteiraQuotes = usePortfolioQuotes(carteiraTickers);
  const dividendWatchlist = useDividendWatchlist();
  const reduceMotion = useReducedMotion();
  const rowMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 } };

  return (
    <div className="flex flex-col gap-6">
      <InvestorWelcome />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <header className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Carteira</span>
          <h1 className="text-2xl font-semibold text-ink">Investimentos</h1>
          <p className="text-sm text-ink-muted">
            Evolução patrimonial, alocação por tipo, proventos e rentabilidade de cada posição.
          </p>
        </header>
        <InvestmentRegistration onSaved={refresh} />
      </div>

      {!loading && positions.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhum investimento cadastrado"
          description="Cadastre sua primeira posição acima. Assim que você adicionar, a evolução patrimonial, a alocação e os proventos aparecem aqui."
        />
      ) : (
        <BentoGrid>
          {/* ---------- HERO: patrimônio + rentabilidade ---------- */}
          <GlassCard variant="hero" className="col-span-12 flex flex-col justify-between gap-6 lg:col-span-7">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-soft">Patrimônio atual</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] px-3 py-1 text-xs text-ink-soft">
                  <Wallet className="h-3.5 w-3.5 text-accent" strokeWidth={2.2} />
                  Valor de mercado
                </span>
              </div>

              <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                <span className="tnum min-w-0 shrink break-words text-5xl font-semibold leading-none text-ink sm:text-6xl">
                  {formatBRL(patrimonio)}
                </span>
                <TrendBadge value={trendMes} className="mb-1 shrink-0" />
              </div>
            </div>

            <div className="-mx-1 -mb-1 opacity-90">
              <TrendLineChart
                data={evolucaoPatrimonial}
                xKey="periodo"
                height={96}
                minimal
                series={[{ key: "atual", label: "Atual", color: CHART.pos, area: true }]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-[var(--color-line)] pt-5">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-ink-muted">Rentabilidade</span>
                <div className="flex items-center gap-2">
                  <span className={cn("tnum text-2xl font-semibold", toneClass(rentabilidade))}>
                    {formatPercent(rentabilidade, true)}
                  </span>
                  <LineChart className={cn("h-4 w-4", toneClass(rentabilidade))} strokeWidth={2.4} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-ink-muted">Ganho de capital</span>
                <span className={cn("tnum text-2xl font-semibold", toneClass(ganho))}>
                  {ganho >= 0 ? "+" : ""}
                  {formatBRL(ganho)}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* ---------- Donut: alocação por tipo ---------- */}
          <GlassCard variant="liquid" className="col-span-12 flex flex-col lg:col-span-5">
            <SectionHeader title="Alocação por tipo" subtitle="Composição da carteira" action={<Layers className="h-4 w-4 text-ink-muted" strokeWidth={2} />} />
            {alocacao.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">Sem posições suficientes para calcular a alocação ainda.</p>
            ) : (
              <>
                <CompositionDonut data={alocacao} height={220} centerLabel="Patrimônio" centerValue={formatBRLCompact(patrimonio)} />
                <ul className="mt-4 flex flex-col gap-2">
                  {alocacao.map((slice, i) => {
                    const share = alocacaoTotal > 0 ? slice.value / alocacaoTotal : 0;
                    return (
                      <li key={slice.name} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2 text-ink-soft">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORICAL[i % CATEGORICAL.length] }} />
                          {slice.name}
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="tnum text-ink">{formatBRL(slice.value)}</span>
                          <span className="tnum w-12 text-right text-xs text-ink-muted">{formatPercent(share)}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </GlassCard>

          {/* ---------- Evolução patrimonial (linha) ---------- */}
          <GlassCard variant="liquid" className="col-span-12 lg:col-span-8">
            <SectionHeader title="Evolução patrimonial" subtitle="Valor aportado x valor de mercado" action={<Landmark className="h-4 w-4 text-ink-muted" strokeWidth={2} />} />
            {evolucaoPatrimonial.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">Atualize o valor de uma posição para começar a ver a evolução ao longo do tempo.</p>
            ) : (
              <TrendLineChart
                data={evolucaoPatrimonial}
                xKey="periodo"
                height={280}
                showLegend
                series={[
                  { key: "investido", label: "Investido", color: CHART.accent },
                  { key: "atual", label: "Atual", color: CHART.pos, area: true },
                ]}
              />
            )}
          </GlassCard>

          {/* ---------- KPIs de apoio ---------- */}
          <div className="col-span-12 flex flex-col gap-4 lg:col-span-4">
            <KpiCard
              label="Total investido"
              value={formatBRL(investido)}
              icon={<Wallet className="size-4" />}
              hint="Custo de aquisição da carteira"
            />
            <KpiCard
              label="Proventos do mês"
              value={formatBRL(proventosMes)}
              icon={<Banknote className="size-4" />}
              tone={proventosMes > 0 ? "pos" : "neutral"}
              hint={`${formatBRL(proventosTotal)} recebidos ao todo`}
            />
          </div>

          {/* ---------- Proventos recentes ---------- */}
          <GlassCard variant="liquid" className="col-span-12">
            <SectionHeader title="Proventos recentes" subtitle="Dividendos, JCP, rendimentos e juros lançados" action={<Banknote className="h-4 w-4 text-ink-muted" strokeWidth={2} />} />
            {proventosRecentes.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">Nenhum provento registrado ainda. Use &quot;Gerenciar&quot; em uma posição para lançar um dividendo, JCP ou rendimento.</p>
            ) : (
              <ul className="mt-4 flex flex-col divide-y divide-[var(--color-line)]">
                {proventosRecentes.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-ink">{entry.investmentName}</span>
                      <span className="text-xs text-ink-muted">{INCOME_LABEL[entry.type] ?? entry.type} · {formatDateBR(entry.paymentDate)}</span>
                    </div>
                    <span className="tnum font-semibold text-pos">+{formatBRL(entry.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>

          {/* ---------- Tabela de posições ---------- */}
          <GlassCard variant="liquid" className="col-span-12">
            <SectionHeader title="Posições" subtitle="Detalhamento por ativo — rentabilidade individual" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-line)] text-left text-xs uppercase tracking-wide text-ink-muted">
                    <th className="py-3 pr-4 font-medium">Ativo</th>
                    <th className="py-3 pr-4 font-medium">Tipo</th>
                    <th className="py-3 pr-4 font-medium">Instituição</th>
                    <th className="py-3 pr-4 text-right font-medium">Investido</th>
                    <th className="py-3 pr-4 text-right font-medium">Atual</th>
                    <th className="py-3 pr-4 text-right font-medium">Rentab.</th>
                    <th className="py-3 text-right font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => {
                    const rent = p.investido > 0 ? (p.atual - p.investido) / p.investido : 0;
                    return (
                      <tr key={p.id} className="border-b border-[var(--color-line)] transition-colors last:border-0 hover:bg-[rgba(255,255,255,0.03)]">
                        <td className="py-3 pr-4 font-medium text-ink">
                          <div className="flex items-center gap-2">
                            {p.nome}
                            {p.ticker && (
                              <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[11px] tracking-wide text-ink-muted">{p.ticker}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-ink-soft">{INVESTMENT_TYPE_LABEL[p.tipo]}</td>
                        <td className="py-3 pr-4 text-ink-muted">{p.instituicao}</td>
                        <td className="tnum py-3 pr-4 text-right text-ink-soft">{formatBRL(p.investido)}</td>
                        <td className="tnum py-3 pr-4 text-right text-ink">{formatBRL(p.atual)}</td>
                        <td className={cn("tnum py-3 pr-4 text-right font-semibold", toneClass(rent))}>{formatPercent(rent, true)}</td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setManaged(p)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-line)] px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:text-ink"
                          >
                            <Settings2 className="size-3.5" />
                            Gerenciar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </BentoGrid>
      )}

      {/* ---------- Mercado: cotações ao vivo (brapi.dev) ---------- */}
      <div className="flex flex-col gap-1 pt-2">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Mercado</span>
        <h2 className="text-lg font-semibold text-ink">Cotações e dividendos</h2>
        <p className="text-sm text-ink-muted">
          Dados via brapi.dev, atualizados automaticamente ao longo do pregão. Não é recomendação de investimento.
          {dividendWatchlist.updatedAt && ` Atualizado ${formatUpdatedAt(dividendWatchlist.updatedAt)}.`}
        </p>
      </div>

      <BentoGrid>
        {carteiraTickers.length > 0 && (
          <GlassCard variant="liquid" className="col-span-12">
            <SectionHeader title="Cotações da carteira" subtitle="Ativos com ticker cadastrado" action={<BarChart3 className="h-4 w-4 text-ink-muted" strokeWidth={2} />} />
            {!carteiraQuotes.loading && carteiraQuotes.quotes.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">{carteiraQuotes.error || "Sem cotações para os tickers cadastrados ainda."}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="mt-2 w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-line)] text-left text-xs uppercase tracking-wide text-ink-muted">
                      <th className="py-3 pr-4 font-medium">Ativo</th>
                      <th className="py-3 pr-4 text-right font-medium">Preço</th>
                      <th className="py-3 pr-4 text-right font-medium">No dia</th>
                      <th className="py-3 pr-4 text-right font-medium">Máxima</th>
                      <th className="py-3 pr-4 text-right font-medium">Mínima</th>
                      <th className="py-3 text-right font-medium">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {carteiraQuotes.quotes.map((quote) => (
                        <motion.tr
                          key={quote.ticker}
                          layout
                          {...rowMotion}
                          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          className="border-b border-[var(--color-line)] last:border-0 hover:bg-[rgba(255,255,255,0.03)]"
                        >
                          <td className="py-3 pr-4 font-medium text-ink">
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[11px] tracking-wide text-ink-muted">{quote.ticker}</span>
                              <span className="text-ink-soft">{quote.name}</span>
                            </div>
                          </td>
                          <td className="tnum py-3 pr-4 text-right font-semibold text-ink">{formatBRL(quote.price)}</td>
                          <td className="py-3 pr-4 text-right"><TrendBadge value={quote.changePercent / 100} className="ml-auto" /></td>
                          <td className="tnum py-3 pr-4 text-right text-ink-soft">{quote.dayHigh !== null ? formatBRL(quote.dayHigh) : "—"}</td>
                          <td className="tnum py-3 pr-4 text-right text-ink-soft">{quote.dayLow !== null ? formatBRL(quote.dayLow) : "—"}</td>
                          <td className="tnum py-3 text-right text-ink-muted">{quote.volume !== null ? formatCompactNumber(quote.volume) : "—"}</td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                    {carteiraQuotes.loading && <SkeletonRows count={carteiraTickers.length} columns={6} />}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        )}

        <GlassCard variant="liquid" className="col-span-12">
          <SectionHeader title="Radar de dividendos" subtitle="Ações acompanhadas da B3 · yield aproximado (12m) exibido onde o plano de dados fornece" action={<Radar className="h-4 w-4 text-ink-muted" strokeWidth={2} />} />
          {!dividendWatchlist.loading && dividendWatchlist.quotes.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">{dividendWatchlist.error}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="mt-2 w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-line)] text-left text-xs uppercase tracking-wide text-ink-muted">
                    <th className="py-3 pr-4 font-medium">Ativo</th>
                    <th className="py-3 pr-4 text-right font-medium">Preço</th>
                    <th className="py-3 pr-4 text-right font-medium">No dia</th>
                    <th className="py-3 text-right font-medium">Yield aprox. (12m)</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {dividendWatchlist.quotes.map((quote) => (
                      <motion.tr
                        key={quote.ticker}
                        layout
                        {...rowMotion}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="border-b border-[var(--color-line)] last:border-0 hover:bg-[rgba(255,255,255,0.03)]"
                      >
                        <td className="py-3 pr-4 font-medium text-ink">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[11px] tracking-wide text-ink-muted">{quote.ticker}</span>
                            <span className="text-ink-soft">{quote.name}</span>
                          </div>
                        </td>
                        <td className="tnum py-3 pr-4 text-right font-semibold text-ink">{formatBRL(quote.price)}</td>
                        <td className="py-3 pr-4 text-right"><TrendBadge value={quote.changePercent / 100} className="ml-auto" /></td>
                        <td className="tnum py-3 text-right font-semibold text-pos">{quote.dividendYieldApprox !== null ? formatPercent(quote.dividendYieldApprox) : "—"}</td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  {dividendWatchlist.loading && <SkeletonRows count={8} columns={4} />}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </BentoGrid>

      <InvestmentManageDialog position={managed} onClose={() => setManaged(null)} onChanged={refresh} />
    </div>
  );
}
