"use client";

import {
  TrendingUp,
  TrendingDown,
  Fuel,
  AlertTriangle,
  Route,
  Gauge,
  Percent,
  Wallet,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { KpiCard } from "@/components/ui/KpiCard";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { CHART } from "@/components/charts/chartTheme";
import { usePeriodo } from "@/lib/usePeriodo";
import { formatBRL, formatPercent } from "@/lib/format";
import { useUberSummary } from "@/lib/supabase/useUberSummary";
import { VehicleManager } from "@/components/uber/VehicleManager";
import { DailyUberEntry } from "@/components/uber/DailyUberEntry";

export default function UberPage() {
  const { modo } = usePeriodo();
  const { data, kpis, loading, error, hasData, comparisonAvailable, refresh } = useUberSummary(modo);

  const granularidade = modo === "anual" ? "por mês" : "por dia";
  const km = kpis.kmRodados.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const ProfitIcon = kpis.lucroLiquido >= 0 ? TrendingUp : TrendingDown;
  const profitComparison = !comparisonAvailable
    ? "Sem dados do período anterior para comparação."
    : kpis.trendLucro > 0
      ? `Lucro cresceu ${formatPercent(Math.abs(kpis.trendLucro))} em relação ao período anterior.`
      : kpis.trendLucro < 0
        ? `Lucro caiu ${formatPercent(Math.abs(kpis.trendLucro))} em relação ao período anterior.`
        : "Lucro estável em relação ao período anterior.";
  const fuelComparison = !comparisonAvailable
    ? `Energia e combustível representam ${formatPercent(kpis.custoCombustivelPct)} da receita.`
    : kpis.trendCombustivel > 0
      ? `Custo subiu ${formatPercent(Math.abs(kpis.trendCombustivel))} e representa ${formatPercent(kpis.custoCombustivelPct)} da receita.`
      : kpis.trendCombustivel < 0
        ? `Custo caiu ${formatPercent(Math.abs(kpis.trendCombustivel))} e representa ${formatPercent(kpis.custoCombustivelPct)} da receita.`
        : `Custo estável e representa ${formatPercent(kpis.custoCombustivelPct)} da receita.`;

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
            Receita bruta, custo de energia ou combustível e lucro líquido — visão{" "}
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
        {loading ? (
          <GlassCard
            variant="liquid"
            className="col-span-12 flex min-h-52 items-center justify-center gap-3 text-sm text-ink-muted"
            role="status"
            aria-live="polite"
          >
            <LoaderCircle className="size-5 animate-spin text-accent" />
            Calculando seu resumo de trabalho...
          </GlassCard>
        ) : error ? (
          <GlassCard variant="liquid" className="col-span-12 flex min-h-52 flex-col items-center justify-center p-8 text-center" role="alert">
            <AlertTriangle className="size-7 text-neg" />
            <h3 className="mt-3 font-semibold text-ink">Resumo indisponível</h3>
            <p className="mt-1 max-w-lg text-sm text-ink-muted">{error}</p>
            <button type="button" className="btn-primary mt-5" onClick={() => void refresh()}>
              <RefreshCw className="size-4" />
              Tentar novamente
            </button>
          </GlassCard>
        ) : !hasData ? (
          <GlassCard variant="hero" className="col-span-12 flex min-h-56 flex-col items-center justify-center p-8 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--color-accent)_16%,transparent)] text-accent">
              <Route className="size-5" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-ink">Seu resumo começa no primeiro dia registrado</h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-ink-muted">
              Use o diário acima para informar corridas, quilômetros e custos. Os indicadores e o gráfico serão calculados automaticamente.
            </p>
          </GlassCard>
        ) : (
          <>
        {/* HERO — lucro líquido (positivo = verde) */}
        <GlassCard
          variant="hero"
          className="relative col-span-12 flex flex-col justify-between gap-6 overflow-hidden lg:col-span-8"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-pos)_28%,transparent),transparent_70%)] blur-2xl"
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-ink-soft">
              <span className={`grid h-8 w-8 place-items-center rounded-full ${kpis.lucroLiquido >= 0 ? "bg-[color-mix(in_oklab,var(--color-pos)_16%,transparent)] text-pos" : "bg-[color-mix(in_oklab,var(--color-neg)_16%,transparent)] text-neg"}`}>
                <ProfitIcon className="h-4 w-4" strokeWidth={2.5} />
              </span>
              Lucro líquido do período
            </div>
            {comparisonAvailable && <TrendBadge value={kpis.trendLucro} />}
          </div>

          <div className="relative">
            <p className={`tnum text-4xl font-semibold leading-none sm:text-6xl ${kpis.lucroLiquido >= 0 ? "text-pos" : "text-neg"}`}>
              {formatBRL(kpis.lucroLiquido)}
            </p>
            <p className="mt-3 text-sm text-ink-soft">
              {profitComparison}
            </p>
          </div>

          <div className="relative grid grid-cols-2 gap-4 border-t border-[var(--color-line)] pt-4 sm:max-w-md">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-ink-muted">Margem líquida</span>
              <span className="tnum text-lg font-semibold text-ink">
                {formatPercent(kpis.margemLiquida)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-ink-muted">Receita bruta</span>
              <span className="tnum text-lg font-semibold text-ink">
                {formatBRL(kpis.receitaPeriodo)}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* ALERTA — custo de combustível (subir = RUIM, invert) */}
        <GlassCard
          variant="liquid"
          className="col-span-12 flex flex-col justify-between gap-4 ring-1 ring-[color-mix(in_oklab,var(--color-warn)_38%,transparent)] sm:col-span-6 lg:col-span-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-ink-soft">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[color-mix(in_oklab,var(--color-warn)_16%,transparent)] text-warn">
                <Fuel className="h-4 w-4" strokeWidth={2.5} />
              </span>
              Energia / combustível
            </div>
            {comparisonAvailable && <TrendBadge value={kpis.trendCombustivel} invert />}
          </div>

          <p className="tnum text-3xl font-semibold text-ink">
            {formatBRL(kpis.combustivelPeriodo)}
          </p>

          <div className="flex items-start gap-2 rounded-xl bg-[color-mix(in_oklab,var(--color-warn)_10%,transparent)] p-3 text-xs text-warn">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />
            <span>{fuelComparison}</span>
          </div>
        </GlassCard>

        {/* GRÁFICO PRINCIPAL — receita x combustível x lucro */}
        <GlassCard variant="liquid" className="col-span-12">
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
              { key: "combustivel", label: "Energia / combustível", color: CHART.neg },
              { key: "lucro", label: "Lucro líquido", color: CHART.pos, area: true },
            ]}
          />
        </GlassCard>

        {/* KPIs de tendência */}
        <KpiCard
          className="col-span-12 sm:col-span-3 lg:col-span-3"
          interactive={false}
          label="Receita do período"
          value={formatBRL(kpis.receitaPeriodo)}
          tone="neutral"
          icon={<Wallet className="h-4 w-4" />}
          hint="Total de corridas (bruto)"
        />

        <KpiCard
          className="col-span-12 sm:col-span-3 lg:col-span-3"
          interactive={false}
          label="Energia / combustível"
          value={formatPercent(kpis.custoCombustivelPct)}
          trend={comparisonAvailable ? kpis.trendCombustivel : undefined}
          invertTrend
          tone="neg"
          icon={<Fuel className="h-4 w-4" />}
          hint="Peso do combustível — quanto menor, melhor"
        />

        <KpiCard
          className="col-span-12 sm:col-span-3 lg:col-span-3"
          interactive={false}
          label="Margem líquida"
          value={formatPercent(kpis.margemLiquida)}
          trend={comparisonAvailable ? kpis.trendMargem : undefined}
          tone={kpis.margemLiquida >= 0 ? "pos" : "neg"}
          icon={<Percent className="h-4 w-4" />}
          hint="Percentual da receita que permanece como lucro"
        />

        {/* Km rodados + custo por km (card composto, interativo) */}
        <GlassCard
          variant="liquid"
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
                {formatBRL(kpis.custoPorKm)}
              </span>
              <span className="text-xs text-ink-muted">Custo / km</span>
            </div>
          </div>
        </GlassCard>
          </>
        )}
      </BentoGrid>
    </section>
  );
}
