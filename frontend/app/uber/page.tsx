"use client";

import {
  TrendingUp,
  Fuel,
  AlertTriangle,
  Route,
  Gauge,
  Percent,
  Wallet,
} from "lucide-react";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { KpiCard } from "@/components/ui/KpiCard";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { CHART } from "@/components/charts/chartTheme";
import { getUber, uberKpis } from "@/lib/mock";
import { usePeriodo } from "@/lib/usePeriodo";
import { formatBRL, formatPercent } from "@/lib/format";
import { VehicleManager } from "@/components/uber/VehicleManager";
import { DailyUberEntry } from "@/components/uber/DailyUberEntry";

export default function UberPage() {
  const { modo } = usePeriodo();
  const data = getUber(modo);

  const granularidade = modo === "anual" ? "por mês" : "por dia";
  const km = uberKpis.kmRodados.toLocaleString("pt-BR");

  return (
    <section aria-labelledby="uber-heading" className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="uber-heading"
            className="text-xl font-semibold tracking-tight text-ink"
          >
            Motorista de App
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Receita bruta, custo de combustível e lucro líquido — visão{" "}
            {granularidade}.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] px-3 py-1 text-xs font-medium text-ink-soft">
          <Route className="h-3.5 w-3.5 text-accent" />
          {modo === "anual" ? "Modo anual" : "Modo mensal"}
        </span>
      </header>

      <BentoGrid>
        <VehicleManager />
        <DailyUberEntry />
        {/* HERO — lucro líquido (positivo = verde) */}
        <GlassCard
          strong
          className="relative col-span-12 flex flex-col justify-between gap-6 overflow-hidden lg:col-span-8"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-pos)_28%,transparent),transparent_70%)] blur-2xl"
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-ink-soft">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[color-mix(in_oklab,var(--color-pos)_16%,transparent)] text-pos">
                <TrendingUp className="h-4 w-4" strokeWidth={2.5} />
              </span>
              Lucro líquido do período
            </div>
            <TrendBadge value={uberKpis.trendLucro} />
          </div>

          <div className="relative">
            <p className="tnum text-4xl font-semibold leading-none text-pos sm:text-6xl">
              {formatBRL(uberKpis.lucroLiquido)}
            </p>
            <p className="mt-3 text-sm text-pos/80">
              Lucro em alta vs. período anterior — tendência positiva.
            </p>
          </div>

          <div className="relative grid grid-cols-2 gap-4 border-t border-[var(--color-line)] pt-4 sm:max-w-md">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-ink-muted">Margem líquida</span>
              <span className="tnum text-lg font-semibold text-ink">
                {formatPercent(uberKpis.margemLiquida)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-ink-muted">Receita bruta</span>
              <span className="tnum text-lg font-semibold text-ink">
                {formatBRL(uberKpis.receitaPeriodo)}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* ALERTA — custo de combustível (subir = RUIM, invert) */}
        <GlassCard
          interactive
          className="col-span-12 flex flex-col justify-between gap-4 ring-1 ring-[color-mix(in_oklab,var(--color-warn)_38%,transparent)] sm:col-span-6 lg:col-span-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-ink-soft">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[color-mix(in_oklab,var(--color-warn)_16%,transparent)] text-warn">
                <Fuel className="h-4 w-4" strokeWidth={2.5} />
              </span>
              Custo de combustível
            </div>
            <TrendBadge value={uberKpis.trendCombustivel} invert />
          </div>

          <p className="tnum text-3xl font-semibold text-ink">
            {formatBRL(uberKpis.combustivelPeriodo)}
          </p>

          <div className="flex items-start gap-2 rounded-xl bg-[color-mix(in_oklab,var(--color-warn)_10%,transparent)] p-3 text-xs text-warn">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
            <span>
              Custo subindo {formatPercent(uberKpis.trendCombustivel, true)} —
              atenção mesmo com o lucro estável. É{" "}
              {formatPercent(uberKpis.custoCombustivelPct)} da receita.
            </span>
          </div>
        </GlassCard>

        {/* GRÁFICO PRINCIPAL — receita x combustível x lucro */}
        <GlassCard className="col-span-12">
          <SectionHeader
            title="Receita, combustível e lucro"
            subtitle={`Evolução ${granularidade} — lucro líquido em destaque (área)`}
          />
          <TrendLineChart
            data={data}
            xKey="periodo"
            height={320}
            showLegend
            series={[
              { key: "receita", label: "Receita bruta", color: CHART.accent2 },
              { key: "combustivel", label: "Combustível", color: CHART.neg },
              { key: "lucro", label: "Lucro líquido", color: CHART.pos, area: true },
            ]}
          />
        </GlassCard>

        {/* KPIs de tendência */}
        <KpiCard
          className="col-span-12 sm:col-span-3 lg:col-span-3"
          label="Receita do período"
          value={formatBRL(uberKpis.receitaPeriodo)}
          tone="neutral"
          icon={<Wallet className="h-4 w-4" />}
          hint="Total de corridas (bruto)"
        />

        <KpiCard
          className="col-span-12 sm:col-span-3 lg:col-span-3"
          label="Combustível / receita"
          value={formatPercent(uberKpis.custoCombustivelPct)}
          trend={uberKpis.trendCombustivel}
          invertTrend
          tone="neg"
          icon={<Fuel className="h-4 w-4" />}
          hint="Peso do combustível — quanto menor, melhor"
        />

        <KpiCard
          className="col-span-12 sm:col-span-3 lg:col-span-3"
          label="Margem líquida"
          value={formatPercent(uberKpis.margemLiquida)}
          trend={uberKpis.trendMargem}
          tone="pos"
          icon={<Percent className="h-4 w-4" />}
          hint="Margem caindo levemente — atenção"
        />

        {/* Km rodados + custo por km (card composto, interativo) */}
        <GlassCard
          interactive
          className="col-span-12 flex flex-col gap-4 sm:col-span-3 lg:col-span-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink-soft">Rodagem</span>
            <span className="text-ink-muted">
              <Gauge className="h-4 w-4" />
            </span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="tnum text-2xl font-semibold text-ink">
                {km}
                <span className="ml-1 text-sm font-normal text-ink-muted">km</span>
              </span>
              <span className="text-xs text-ink-muted">Distância rodada</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="tnum text-lg font-semibold text-ink">
                {formatBRL(uberKpis.custoPorKm)}
              </span>
              <span className="text-xs text-ink-muted">Custo / km</span>
            </div>
          </div>
        </GlassCard>
      </BentoGrid>
    </section>
  );
}
