"use client";

import { TrendingUp, Wallet, Layers, Sparkles } from "lucide-react";

import { BentoGrid } from "@/components/ui/BentoGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { CompositionDonut } from "@/components/charts/CompositionDonut";
import { CHART, CATEGORICAL } from "@/components/charts/chartTheme";
import { formatBRL, formatBRLCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  evolucaoPatrimonial,
  alocacao,
  posicoes,
  investimentosKpis,
} from "@/lib/data/empty";

const { patrimonio, investido, rentabilidade, ganho, trendMes } =
  investimentosKpis;

const alocacaoTotal = alocacao.reduce((acc, s) => acc + s.value, 0);

/** Retorna a classe de cor semântica conforme o sinal do valor. */
function toneClass(value: number): string {
  return value >= 0 ? "text-pos" : "text-neg";
}

export default function InvestimentosPage() {
  if (posicoes.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Carteira</span>
          <h1 className="text-2xl font-semibold text-ink">Investimentos</h1>
          <p className="text-sm text-ink-muted">Evolução patrimonial, alocação e rentabilidade da sua carteira.</p>
        </header>
        <EmptyState
          icon={Wallet}
          title="Nenhum investimento cadastrado"
          description="Quando você adicionar suas posições, a evolução patrimonial e a alocação serão exibidas aqui."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
          Carteira
        </span>
        <h1 className="text-2xl font-semibold text-ink">Investimentos</h1>
        <p className="text-sm text-ink-muted">
          Evolução patrimonial, alocação por tipo e rentabilidade de cada
          posição.
        </p>
      </header>

      <BentoGrid>
        {/* ---------- HERO: patrimônio + rentabilidade ---------- */}
        <GlassCard
          variant="hero"
          className="col-span-12 flex flex-col justify-between gap-6 lg:col-span-7"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink-soft">
                Patrimônio atual
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] px-3 py-1 text-xs text-ink-soft">
                <Wallet className="h-3.5 w-3.5 text-accent" strokeWidth={2.2} />
                Valor de mercado
              </span>
            </div>

            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <span className="tnum text-5xl font-semibold leading-none text-ink sm:text-6xl">
                {formatBRL(patrimonio)}
              </span>
              <TrendBadge value={trendMes} className="mb-1" />
            </div>
          </div>

          {/* Sparkline de fundo — atmosfera, não decorativo (série "atual") */}
          <div className="-mx-1 -mb-1 opacity-90">
            <TrendLineChart
              data={evolucaoPatrimonial}
              xKey="periodo"
              height={96}
              minimal
              series={[
                { key: "atual", label: "Atual", color: CHART.pos, area: true },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-[var(--color-line)] pt-5">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-ink-muted">Rentabilidade</span>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "tnum text-2xl font-semibold",
                    toneClass(rentabilidade),
                  )}
                >
                  {formatPercent(rentabilidade, true)}
                </span>
                <TrendingUp
                  className={cn("h-4 w-4", toneClass(rentabilidade))}
                  strokeWidth={2.4}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-ink-muted">Ganho acumulado</span>
              <span
                className={cn(
                  "tnum text-2xl font-semibold",
                  toneClass(ganho),
                )}
              >
                {ganho >= 0 ? "+" : ""}
                {formatBRL(ganho)}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* ---------- Donut: alocação por tipo ---------- */}
        <GlassCard variant="liquid" className="col-span-12 flex flex-col lg:col-span-5">
          <SectionHeader
            title="Alocação por tipo"
            subtitle="Composição da carteira"
            action={
              <Layers className="h-4 w-4 text-ink-muted" strokeWidth={2} />
            }
          />
          <CompositionDonut
            data={alocacao}
            height={220}
            centerLabel="Patrimônio"
            centerValue={formatBRLCompact(patrimonio)}
          />
          <ul className="mt-4 flex flex-col gap-2">
            {alocacao.map((slice, i) => {
              const share = slice.value / alocacaoTotal;
              return (
                <li
                  key={slice.name}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex items-center gap-2 text-ink-soft">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          CATEGORICAL[i % CATEGORICAL.length],
                      }}
                    />
                    {slice.name}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tnum text-ink">
                      {formatBRL(slice.value)}
                    </span>
                    <span className="tnum w-12 text-right text-xs text-ink-muted">
                      {formatPercent(share)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </GlassCard>

        {/* ---------- Evolução patrimonial (linha) ---------- */}
        <GlassCard variant="liquid" className="col-span-12 lg:col-span-8">
          <SectionHeader
            title="Evolução patrimonial"
            subtitle="Valor aportado x valor de mercado — últimos 12 meses"
            action={
              <Sparkles className="h-4 w-4 text-ink-muted" strokeWidth={2} />
            }
          />
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
        </GlassCard>

        {/* ---------- KPIs de apoio ---------- */}
        <div className="col-span-12 flex flex-col gap-4 lg:col-span-4">
          <GlassCard variant="liquid" className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink-soft">
              Total investido
            </span>
            <span className="tnum text-2xl font-semibold text-ink">
              {formatBRL(investido)}
            </span>
            <span className="text-xs text-ink-muted">
              Custo de aquisição da carteira
            </span>
          </GlassCard>

          <GlassCard variant="liquid" className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink-soft">
              Resultado
            </span>
            <div className="flex items-end justify-between gap-2">
              <span
                className={cn(
                  "tnum text-2xl font-semibold",
                  toneClass(ganho),
                )}
              >
                {ganho >= 0 ? "+" : ""}
                {formatBRL(ganho)}
              </span>
              <TrendBadge value={rentabilidade} />
            </div>
            <span className="text-xs text-ink-muted">
              {posicoes.length} posições ativas
            </span>
          </GlassCard>
        </div>

        {/* ---------- Tabela de posições ---------- */}
        <GlassCard variant="liquid" className="col-span-12">
          <SectionHeader
            title="Posições"
            subtitle="Detalhamento por ativo — rentabilidade individual"
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="py-3 pr-4 font-medium">Ativo</th>
                  <th className="py-3 pr-4 font-medium">Tipo</th>
                  <th className="py-3 pr-4 font-medium">Instituição</th>
                  <th className="py-3 pr-4 text-right font-medium">
                    Investido
                  </th>
                  <th className="py-3 pr-4 text-right font-medium">Atual</th>
                  <th className="py-3 text-right font-medium">Rentab.</th>
                </tr>
              </thead>
              <tbody>
                {posicoes.map((p) => {
                  const rent = (p.atual - p.investido) / p.investido;
                  return (
                    <tr
                      key={p.nome}
                      className="border-b border-[var(--color-line)] transition-colors last:border-0 hover:bg-[rgba(255,255,255,0.03)]"
                    >
                      <td className="py-3 pr-4 font-medium text-ink">
                        {p.nome}
                      </td>
                      <td className="py-3 pr-4 text-ink-soft">{p.tipo}</td>
                      <td className="py-3 pr-4 text-ink-muted">
                        {p.instituicao}
                      </td>
                      <td className="tnum py-3 pr-4 text-right text-ink-soft">
                        {formatBRL(p.investido)}
                      </td>
                      <td className="tnum py-3 pr-4 text-right text-ink">
                        {formatBRL(p.atual)}
                      </td>
                      <td
                        className={cn(
                          "tnum py-3 text-right font-semibold",
                          toneClass(rent),
                        )}
                      >
                        {formatPercent(rent, true)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </BentoGrid>
    </div>
  );
}
