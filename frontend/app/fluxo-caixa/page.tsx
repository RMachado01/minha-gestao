"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Scale,
  PiggyBank,
} from "lucide-react";

import { BentoGrid } from "@/components/ui/BentoGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { KpiCard } from "@/components/ui/KpiCard";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CompareBarChart } from "@/components/charts/CompareBarChart";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { CHART } from "@/components/charts/chartTheme";

import { usePeriodo } from "@/lib/usePeriodo";
import { getFluxo, fluxoKpis } from "@/lib/mock/fluxo";
import { formatBRL, formatPercent, variacao } from "@/lib/format";

/** Rótulos contextuais conforme o filtro de período global. */
function periodoLabel(modo: "mensal" | "anual") {
  return modo === "anual"
    ? { granular: "por mês", janela: "nos últimos 12 meses", eixo: "12 meses" }
    : { granular: "por semana", janela: "nas 4 semanas do mês", eixo: "4 semanas" };
}

export default function FluxoCaixaPage() {
  const { modo } = usePeriodo();
  const data = getFluxo(modo);
  const rotulo = periodoLabel(modo);

  // Agregações do período selecionado (reagem ao toggle mensal/anual).
  const totalEntradas = data.reduce((acc, p) => acc + Number(p.entradas), 0);
  const totalSaidas = data.reduce((acc, p) => acc + Number(p.saidas), 0);
  const saldoAcumulado = totalEntradas - totalSaidas;
  const saldoPositivo = saldoAcumulado >= 0;

  // Tendência período-sobre-período: último ponto vs. o anterior (equivalentes).
  const ultimo = data[data.length - 1];
  const penultimo = data[data.length - 2];
  const trendHero =
    penultimo !== undefined
      ? variacao(Number(ultimo.saldo), Number(penultimo.saldo))
      : 0;

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* ---------- Hero + gráficos principais ---------- */}
      <section aria-labelledby="fluxo-hero" className="flex flex-col gap-4 lg:gap-5">
        <h2 id="fluxo-hero" className="sr-only">
          Fluxo de caixa — entradas contra saídas
        </h2>

        <BentoGrid>
          {/* Card hero: número grande do saldo + gráfico de barras principal. */}
          <GlassCard
            strong
            interactive
            className="col-span-1 flex flex-col gap-5 sm:col-span-6 lg:col-span-8"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Saldo acumulado {rotulo.janela}
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`tnum text-4xl font-semibold sm:text-5xl ${
                      saldoPositivo ? "text-pos" : "text-neg"
                    }`}
                  >
                    {formatBRL(saldoAcumulado)}
                  </span>
                  <TrendBadge value={trendHero} />
                </div>
                <span className="text-xs text-ink-muted">
                  Entradas {formatBRL(totalEntradas)} · Saídas{" "}
                  {formatBRL(totalSaidas)}
                </span>
              </div>

              {/* Legenda semântica manual (verde=entrada, vermelho=saída). */}
              <div className="flex items-center gap-4 text-xs text-ink-soft">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: CHART.pos }}
                    aria-hidden
                  />
                  Entradas
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: CHART.neg }}
                    aria-hidden
                  />
                  Saídas
                </span>
              </div>
            </div>

            <div>
              <SectionHeader
                title="Entradas × Saídas"
                subtitle={`Comparação lado a lado ${rotulo.granular}`}
              />
              <CompareBarChart
                data={data}
                xKey="periodo"
                height={320}
                showLegend={false}
                series={[
                  { key: "entradas", label: "Entradas", color: CHART.pos },
                  { key: "saidas", label: "Saídas", color: CHART.neg },
                ]}
              />
            </div>
          </GlassCard>

          {/* Card lateral: evolução do saldo (área) ao longo do período. */}
          <GlassCard
            interactive
            className="col-span-1 flex flex-col sm:col-span-6 lg:col-span-4"
          >
            <SectionHeader
              title="Evolução do saldo"
              subtitle={`Tendência ${rotulo.eixo}`}
              action={<TrendBadge value={trendHero} />}
            />
            <div className="mt-auto">
              <TrendLineChart
                data={data}
                xKey="periodo"
                height={300}
                series={[
                  {
                    key: "saldo",
                    label: "Saldo",
                    color: saldoPositivo ? CHART.pos : CHART.neg,
                    area: true,
                  },
                ]}
              />
            </div>
          </GlassCard>
        </BentoGrid>
      </section>

      {/* ---------- Faixa de KPIs do mês corrente ---------- */}
      <section aria-labelledby="fluxo-kpis" className="flex flex-col gap-4">
        <h2
          id="fluxo-kpis"
          className="text-sm font-medium uppercase tracking-wide text-ink-muted"
        >
          Indicadores do mês
        </h2>

        <BentoGrid>
          <KpiCard
            className="col-span-1 sm:col-span-3 lg:col-span-3"
            label="Entradas"
            value={formatBRL(fluxoKpis.entradas)}
            trend={fluxoKpis.trendEntradas}
            tone="pos"
            icon={<ArrowUpCircle className="h-4 w-4" />}
            hint="Renda fixa + variável"
          />
          <KpiCard
            className="col-span-1 sm:col-span-3 lg:col-span-3"
            label="Saídas"
            value={formatBRL(fluxoKpis.saidas)}
            trend={fluxoKpis.trendSaidas}
            invertTrend
            tone="neg"
            icon={<ArrowDownCircle className="h-4 w-4" />}
            hint="Gastos fixos + variáveis"
          />
          <KpiCard
            className="col-span-1 sm:col-span-3 lg:col-span-3"
            label="Saldo do mês"
            value={formatBRL(fluxoKpis.saldo)}
            trend={fluxoKpis.trendSaldo}
            tone="pos"
            icon={<Scale className="h-4 w-4" />}
            hint="vs. mês anterior"
          />
          <KpiCard
            className="col-span-1 sm:col-span-3 lg:col-span-3"
            label="Economia"
            value={formatPercent(fluxoKpis.economiaPct)}
            tone="pos"
            icon={<PiggyBank className="h-4 w-4" />}
            hint="Saldo ÷ entradas"
          />
        </BentoGrid>
      </section>
    </div>
  );
}
