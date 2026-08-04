"use client";

import { AlertTriangle, Car, Coins, Gauge, Wrench } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatBRL } from "@/lib/format";
import { MAINTENANCE_INTERVALS } from "@/lib/vehicleCosts";
import type { VehicleAnalytics } from "@/lib/supabase/useGarage";

const URGENCY_STYLE = {
  ok: "bg-emerald-400/10 text-pos",
  soon: "bg-amber-400/10 text-warn",
  overdue: "bg-rose-400/10 text-neg",
} as const;

/** Barra de composição do custo: quanto é fixo x variável. */
function CostSplit({ fixedShare }: { fixedShare: number }) {
  const fixedPct = Math.round(fixedShare * 100);
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="bg-accent-2" style={{ width: `${fixedPct}%` }} />
        <div className="bg-warn" style={{ width: `${100 - fixedPct}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-muted">
        <span>Fixo {fixedPct}%</span>
        <span>Variável {100 - fixedPct}%</span>
      </div>
    </div>
  );
}

export function VehicleCostCard({ data, onRegisterMaintenance, onEditCosts }: {
  data: VehicleAnalytics;
  onRegisterMaintenance: (vehicleId: string) => void;
  onEditCosts: (vehicleId: string) => void;
}) {
  const { vehicle, fixed, kmMonth, variableMonth, perKm, totalMonth, nextMaintenance } = data;
  const semRodagem = kmMonth <= 0;

  return (
    <GlassCard variant="default" className="col-span-12 flex flex-col gap-5 lg:col-span-6">
      {/* Identificação */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--color-accent)_16%,transparent)] text-accent">
            <Car className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{vehicle.brand} {vehicle.model}</p>
            <p className="text-xs text-ink-muted">
              {vehicle.year}
              {vehicle.plate ? ` · ${vehicle.plate}` : ""}
              {" · "}
              <span className="tnum">{vehicle.odometer.toLocaleString("pt-BR")} km</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => onEditCosts(vehicle.id)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-line)] px-3 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent"
          >
            <Coins className="size-3.5" />
            Custos
          </button>
          <button
            type="button"
            onClick={() => onRegisterMaintenance(vehicle.id)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-line)] px-3 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent"
          >
            <Wrench className="size-3.5" />
            Manutenção
          </button>
        </div>
      </div>

      {/* Custo real por km — o número que importa */}
      <div className="rounded-2xl bg-[color-mix(in_oklab,var(--color-accent)_8%,transparent)] p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Custo real por km</p>
        {semRodagem ? (
          <p className="mt-2 text-sm text-ink-muted">
            Registre a rodagem do mês para calcular — os custos fixos sozinhos não definem o custo por km.
          </p>
        ) : (
          <>
            <p className="tnum mt-1 text-3xl font-semibold text-ink">{formatBRL(perKm.totalPerKm)}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {formatBRL(perKm.variablePerKm)} de uso + {formatBRL(perKm.fixedPerKm)} de custo fixo rateado
            </p>
            <div className="mt-3">
              <CostSplit fixedShare={perKm.fixedShare} />
            </div>
          </>
        )}
      </div>

      {/* Composição do mês */}
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl border border-[var(--color-line)] p-3">
          <dt className="text-xs text-ink-muted">Rodados no mês</dt>
          <dd className="tnum mt-1 font-semibold text-ink">
            <Gauge className="mr-1 inline size-3.5 text-accent" />
            {kmMonth.toLocaleString("pt-BR")} km
          </dd>
        </div>
        <div className="rounded-2xl border border-[var(--color-line)] p-3">
          <dt className="text-xs text-ink-muted">Custo do mês</dt>
          <dd className="tnum mt-1 font-semibold text-ink">{formatBRL(totalMonth)}</dd>
        </div>
        <div className="rounded-2xl border border-[var(--color-line)] p-3">
          <dt className="text-xs text-ink-muted">Variável (uso)</dt>
          <dd className="tnum mt-1 font-semibold text-warn">{formatBRL(variableMonth)}</dd>
        </div>
        <div className="rounded-2xl border border-[var(--color-line)] p-3">
          <dt className="text-xs text-ink-muted">Fixo mensal</dt>
          <dd className="tnum mt-1 font-semibold text-accent-2">{formatBRL(fixed.totalMonthly)}</dd>
        </div>
      </dl>

      {/* Detalhe dos fixos */}
      {fixed.totalAnnual > 0 ? (
        <div className="rounded-2xl border border-[var(--color-line)] p-3">
          <p className="text-xs font-medium text-ink-soft">Custos fixos por ano</p>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-ink-muted">
            {fixed.depreciation > 0 && <li className="flex justify-between gap-2"><span>Depreciação</span><span className="tnum text-ink-soft">{formatBRL(fixed.depreciation)}</span></li>}
            {fixed.insurance > 0 && <li className="flex justify-between gap-2"><span>Seguro</span><span className="tnum text-ink-soft">{formatBRL(fixed.insurance)}</span></li>}
            {fixed.ipva > 0 && <li className="flex justify-between gap-2"><span>IPVA</span><span className="tnum text-ink-soft">{formatBRL(fixed.ipva)}</span></li>}
            {fixed.licensing > 0 && <li className="flex justify-between gap-2"><span>Licenciamento</span><span className="tnum text-ink-soft">{formatBRL(fixed.licensing)}</span></li>}
          </ul>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-[var(--color-line)] p-3 text-xs text-ink-muted">
          Sem custos fixos cadastrados. Informe IPVA, seguro e valor de compra no veículo para ver o custo real por km — eles costumam pesar mais que o combustível.
        </p>
      )}

      {/* Próxima manutenção */}
      {nextMaintenance && (
        <div className={`flex items-start gap-2.5 rounded-2xl p-3 text-sm ${URGENCY_STYLE[nextMaintenance.status.urgency]}`}>
          {nextMaintenance.status.urgency === "ok" ? <Wrench className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
          <div>
            <p className="font-semibold">
              {MAINTENANCE_INTERVALS[nextMaintenance.kind]?.label ?? "Manutenção"}
              {nextMaintenance.status.urgency === "overdue" ? " — atrasada" : nextMaintenance.status.urgency === "soon" ? " — em breve" : ""}
            </p>
            <p className="mt-0.5 text-xs opacity-90">
              {nextMaintenance.status.kmRemaining != null && (
                <>
                  {nextMaintenance.status.kmRemaining >= 0
                    ? `Faltam ${nextMaintenance.status.kmRemaining.toLocaleString("pt-BR")} km`
                    : `${Math.abs(nextMaintenance.status.kmRemaining).toLocaleString("pt-BR")} km além do previsto`}
                </>
              )}
              {nextMaintenance.status.kmRemaining != null && nextMaintenance.status.daysRemaining != null && " · "}
              {nextMaintenance.status.daysRemaining != null && (
                <>
                  {nextMaintenance.status.daysRemaining >= 0
                    ? `${nextMaintenance.status.daysRemaining} dia${nextMaintenance.status.daysRemaining === 1 ? "" : "s"}`
                    : `${Math.abs(nextMaintenance.status.daysRemaining)} dia${Math.abs(nextMaintenance.status.daysRemaining) === 1 ? "" : "s"} de atraso`}
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
