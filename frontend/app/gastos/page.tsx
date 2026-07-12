"use client";

import { PieChart, Flame, Layers, Receipt, TrendingUp } from "lucide-react";

import { BentoGrid } from "@/components/ui/BentoGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { KpiCard } from "@/components/ui/KpiCard";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";

import { CompositionDonut } from "@/components/charts/CompositionDonut";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { CATEGORICAL, CHART } from "@/components/charts/chartTheme";

import { formatBRL, formatPercent, variacao } from "@/lib/format";
import { usePeriodo } from "@/lib/usePeriodo";
import {
  gastosPorCategoria,
  gastosTotal,
  gastosHistorico,
} from "@/lib/mock";

/**
 * Composição de Gastos (CLAUDE.md 6.2 · item 3).
 * Donut de composição + ranking das categorias que mais pesam + evolução do total.
 * Gasto é saída: crescer é ruim → TrendBadge com `invert`.
 */
export default function GastosPage() {
  const { modo } = usePeriodo();

  // Ordena do maior para o menor e fixa a cor por posição — o donut e a
  // tabela consomem exatamente este array, então as cores casam sempre.
  const categorias = [...gastosPorCategoria]
    .sort((a, b) => b.value - a.value)
    .map((c, i) => ({ ...c, color: CATEGORICAL[i % CATEGORICAL.length] }));

  const maiorPeso = categorias[0];
  const maiorAlta = categorias.reduce(
    (max, c) => (c.trend > max.trend ? c : max),
    categorias[0],
  );
  const totalTransacoes = categorias.reduce((s, c) => s + c.transacoes, 0);

  const ultimo = gastosHistorico[gastosHistorico.length - 1];
  const penultimo = gastosHistorico[gastosHistorico.length - 2];
  const tendenciaTotal = variacao(ultimo.gastos, penultimo.gastos);

  const historicoSubtitle =
    modo === "anual" ? "Total gasto mês a mês no ano" : "Total gasto nos últimos 6 meses";

  return (
    <section aria-labelledby="gastos-heading" className="gz-page">
      <style>{gzKeyframes}</style>

      <h2 id="gastos-heading" className="sr-only">
        Composição de gastos
      </h2>

      <BentoGrid>
        {/* Donut de composição — card de destaque (hero) */}
        <GlassCard
          strong
          className="gz-rise col-span-12 flex flex-col lg:col-span-5"
          style={{ animationDelay: "0ms" }}
        >
          <SectionHeader
            title="Para onde o dinheiro foi"
            subtitle="Composição do mês por categoria"
            action={
              <span className="rounded-full border border-[var(--color-line)] px-2.5 py-1 text-xs font-medium text-ink-soft">
                {categorias.length} categorias
              </span>
            }
          />

          <CompositionDonut
            data={categorias}
            centerLabel="Total"
            centerValue={formatBRL(gastosTotal)}
            height={248}
          />

          {/* Legenda compacta — mesma cor/ordem do donut e da tabela */}
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
            {categorias.map((c) => (
              <li
                key={c.name}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="truncate text-ink-soft">{c.name}</span>
                </span>
                <span className="tnum shrink-0 text-xs text-ink-muted">
                  {formatPercent(c.value / gastosTotal)}
                </span>
              </li>
            ))}
          </ul>
        </GlassCard>

        {/* Coluna direita: KPIs + evolução */}
        <div className="col-span-12 grid grid-cols-2 gap-4 lg:col-span-7 lg:gap-5">
          <KpiCard
            className="gz-rise col-span-2 sm:col-span-1"
            style={{ animationDelay: "60ms" }}
            label="Total do mês"
            value={formatBRL(gastosTotal)}
            trend={tendenciaTotal}
            invertTrend
            tone="neutral"
            icon={<PieChart className="h-4 w-4" strokeWidth={2} />}
            hint="vs. mês anterior — cair é bom"
          />

          <KpiCard
            className="gz-rise col-span-2 sm:col-span-1"
            style={{ animationDelay: "120ms" }}
            label="Maior peso no orçamento"
            value={formatPercent(maiorPeso.value / gastosTotal)}
            trend={maiorPeso.trend}
            invertTrend
            tone="neutral"
            icon={<Layers className="h-4 w-4" strokeWidth={2} />}
            hint={`${maiorPeso.name} · ${formatBRL(maiorPeso.value)}`}
          />

          <KpiCard
            className="gz-rise col-span-2 sm:col-span-1"
            style={{ animationDelay: "180ms" }}
            label="Categoria em alta"
            value={maiorAlta.name}
            trend={maiorAlta.trend}
            invertTrend
            tone="neg"
            icon={<Flame className="h-4 w-4" strokeWidth={2} />}
            hint={`${formatBRL(maiorAlta.value)} neste mês`}
          />

          <KpiCard
            className="gz-rise col-span-2 sm:col-span-1"
            style={{ animationDelay: "240ms" }}
            label="Transações"
            value={String(totalTransacoes)}
            tone="neutral"
            icon={<Receipt className="h-4 w-4" strokeWidth={2} />}
            hint="lançamentos de saída no mês"
          />

          {/* Evolução do total de gastos */}
          <GlassCard
            className="gz-rise col-span-2 flex flex-col"
            style={{ animationDelay: "300ms" }}
          >
            <SectionHeader
              title="Evolução dos gastos"
              subtitle={historicoSubtitle}
              action={
                <span className="flex items-center gap-1.5 text-xs text-ink-soft">
                  <TrendingUp
                    className="h-4 w-4 text-neg"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <TrendBadge value={tendenciaTotal} invert />
                </span>
              }
            />
            <TrendLineChart
              data={gastosHistorico}
              xKey="periodo"
              series={[
                { key: "gastos", label: "Gastos", color: CHART.neg, area: true },
              ]}
              height={200}
            />
          </GlassCard>
        </div>

        {/* Ranking — tabela das categorias que mais pesam */}
        <GlassCard
          className="gz-rise col-span-12"
          style={{ animationDelay: "360ms" }}
        >
          <SectionHeader
            title="Ranking de categorias"
            subtitle="Ordenado pelo que mais pesa no mês — variação vs. mês anterior"
          />

          <div className="-mx-2 overflow-x-auto px-2">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <caption className="sr-only">
                Categorias de gasto ordenadas do maior para o menor valor.
              </caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Categoria
                  </th>
                  <th scope="col" className="py-2 px-3 text-right font-medium">
                    Valor
                  </th>
                  <th scope="col" className="py-2 px-3 font-medium">
                    % do total
                  </th>
                  <th scope="col" className="py-2 px-3 text-center font-medium">
                    Tendência
                  </th>
                  <th scope="col" className="py-2 pl-3 text-right font-medium">
                    Transações
                  </th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((c, i) => {
                  const share = c.value / gastosTotal;
                  return (
                    <tr
                      key={c.name}
                      className="group border-t border-[var(--color-line)] transition-colors hover:bg-white/[0.03] focus-within:bg-white/[0.04]"
                    >
                      <th
                        scope="row"
                        className="py-3 pr-3 text-left font-normal"
                      >
                        <span className="flex items-center gap-3">
                          <span
                            aria-hidden
                            className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-semibold tnum text-ink-muted"
                            style={{
                              backgroundColor: `${c.color}1f`,
                              color: c.color,
                            }}
                          >
                            {i + 1}
                          </span>
                          <span
                            aria-hidden
                            className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white/5"
                            style={{ backgroundColor: c.color }}
                          />
                          <span className="font-medium text-ink">{c.name}</span>
                        </span>
                      </th>

                      <td className="tnum py-3 px-3 text-right font-semibold text-ink">
                        {formatBRL(c.value)}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="tnum w-12 shrink-0 text-ink-soft">
                            {formatPercent(share)}
                          </span>
                          <span
                            aria-hidden
                            className="h-1.5 min-w-[3rem] flex-1 overflow-hidden rounded-full bg-white/5"
                          >
                            <span
                              className="block h-full rounded-full transition-[width] duration-500"
                              style={{
                                width: `${Math.round(share * 100)}%`,
                                backgroundColor: c.color,
                              }}
                            />
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <TrendBadge value={c.trend} invert />
                      </td>

                      <td className="tnum py-3 pl-3 text-right text-ink-soft">
                        {c.transacoes}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-[var(--color-line-strong)] text-ink-soft">
                  <th scope="row" className="py-3 pr-3 text-left font-medium">
                    Total
                  </th>
                  <td className="tnum py-3 px-3 text-right font-semibold text-ink">
                    {formatBRL(gastosTotal)}
                  </td>
                  <td className="tnum py-3 px-3 text-ink-soft">100,0%</td>
                  <td className="py-3 px-3 text-center">
                    <TrendBadge value={tendenciaTotal} invert />
                  </td>
                  <td className="tnum py-3 pl-3 text-right text-ink-soft">
                    {totalTransacoes}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </GlassCard>
      </BentoGrid>
    </section>
  );
}

/** Reveal em cascata no load. prefers-reduced-motion é neutralizado globalmente. */
const gzKeyframes = `
@keyframes gzRise {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.gz-rise {
  animation: gzRise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
`;
