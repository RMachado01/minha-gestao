"use client";

import { useMemo, useState } from "react";
import { Car, Fuel, Gauge, Calculator, Check, Plus } from "lucide-react";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { VehicleManager } from "@/components/uber/VehicleManager";
import { formatBRL } from "@/lib/format";

type Powertrain = "electric" | "hybrid" | "combustion";
type GarageEntry = { date: string; km: number; totalCost: number };

export default function GaragemPage() {
  // Form state
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [distanceMode, setDistanceMode] = useState<"distance" | "odometer">("distance");
  const [km, setKm] = useState(0);
  const [odometerStart, setOdometerStart] = useState(0);
  const [odometerEnd, setOdometerEnd] = useState(0);
  const [powertrain, setPowertrain] = useState<Powertrain>("electric");
  const [efficiency, setEfficiency] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);
  const [otherCosts, setOtherCosts] = useState(0);
  const [saved, setSaved] = useState(false);
  const [entries, setEntries] = useState<GarageEntry[]>([]);

  const distanceKm = distanceMode === "distance" ? km : Math.max(odometerEnd - odometerStart, 0);

  const energyConsumed = useMemo(() => {
    if (powertrain === "electric") return (distanceKm * efficiency) / 100;
    return efficiency > 0 ? distanceKm / efficiency : 0;
  }, [distanceKm, efficiency, powertrain]);

  const energyCost = useMemo(() => energyConsumed * unitPrice, [energyConsumed, unitPrice]);
  const totalCost = useMemo(() => energyCost + otherCosts, [energyCost, otherCosts]);
  const costPerKm = distanceKm > 0 ? totalCost / distanceKm : 0;

  const kpiTotalKm = entries.reduce((sum, entry) => sum + entry.km, 0);
  const kpiTotalFuel = entries.reduce((sum, entry) => sum + entry.totalCost, 0);
  const kpiAvgCostKm = kpiTotalKm > 0 ? kpiTotalFuel / kpiTotalKm : 0;
  const kpiVehicles = 0;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const newEntry: GarageEntry = {
      date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      km: distanceKm,
      totalCost,
    };
    setEntries((prev) => [newEntry, ...prev].slice(0, 5));
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <section
      aria-labelledby="garagem-heading"
      className="flex flex-col gap-5 animate-[gz-rise_0.45s_ease-out_both]"
    >
      <PageHeader
        eyebrow="Veículos"
        title="Garagem"
        description="Controle de veículos, consumo de combustível e manutenção."
      />

      <BentoGrid>
        {/* KPI cards */}
        <KpiCard
          className="col-span-12 sm:col-span-6 lg:col-span-3"
          label="Total km este mês"
          value={`${kpiTotalKm.toLocaleString("pt-BR")} km`}
          tone="neutral"
          icon={<Gauge className="h-4 w-4" />}
          hint="Quilometragem acumulada no mês"
        />
        <KpiCard
          className="col-span-12 sm:col-span-6 lg:col-span-3"
          label="Custo médio/km"
          value={formatBRL(kpiAvgCostKm)}
          tone="neutral"
          icon={<Calculator className="h-4 w-4" />}
          hint="Média ponderada do mês"
        />
        <KpiCard
          className="col-span-12 sm:col-span-6 lg:col-span-3"
          label="Total em combustível"
          value={formatBRL(kpiTotalFuel)}
          tone="neg"
          icon={<Fuel className="h-4 w-4" />}
          hint="Soma de energia/combustível no mês"
        />
        <KpiCard
          className="col-span-12 sm:col-span-6 lg:col-span-3"
          label="Veículos cadastrados"
          value={String(kpiVehicles)}
          tone="neutral"
          icon={<Car className="h-4 w-4" />}
          hint="Ativos na garagem"
        />

        {/* Vehicle registration */}
        <VehicleManager />

        {/* Daily entry form */}
        <GlassCard variant="liquid" className="col-span-12 p-6 lg:p-7">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-accent">
                Registro diário
              </p>
              <h3 className="mt-1 text-lg font-semibold text-ink">Registrar uso do veículo</h3>
              <p className="mt-1 text-sm text-ink-muted">
                Informe a rodagem e custos; o gasto total é calculado automaticamente.
              </p>
            </div>
            <span className="ios-glass inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs text-ink-soft">
              <Calculator className="size-4 text-accent" />
              Cálculo em tempo real
            </span>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
            <form onSubmit={submit} className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <label className="field-label">
                Data
                <input
                  className="field"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </label>

              <label className="field-label">
                Veículo / motorização
                <select
                  className="field"
                  value={powertrain}
                  onChange={(e) => {
                    const next = e.target.value as Powertrain;
                    setPowertrain(next);
                    setEfficiency(0);
                    setUnitPrice(0);
                  }}
                >
                  <option value="electric">Elétrico</option>
                  <option value="hybrid">Híbrido</option>
                  <option value="combustion">Combustão</option>
                </select>
              </label>

              <fieldset className="sm:col-span-2 lg:col-span-1">
                <legend className="field-label">Distância</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={distanceMode === "distance"}
                    onClick={() => setDistanceMode("distance")}
                    className={`min-h-11 rounded-xl border text-sm font-semibold ${distanceMode === "distance" ? "border-accent bg-accent/10 text-ink" : "border-[var(--color-line)] text-ink-soft"}`}
                  >
                    Km
                  </button>
                  <button
                    type="button"
                    aria-pressed={distanceMode === "odometer"}
                    onClick={() => setDistanceMode("odometer")}
                    className={`min-h-11 rounded-xl border text-sm font-semibold ${distanceMode === "odometer" ? "border-accent bg-accent/10 text-ink" : "border-[var(--color-line)] text-ink-soft"}`}
                  >
                    Odômetro
                  </button>
                </div>
              </fieldset>

              {distanceMode === "distance" ? (
                <label className="field-label">
                  Quilômetros rodados
                  <input
                    className="field tnum"
                    type="number"
                    min="0"
                    step="0.1"
                    value={km || ""}
                    onChange={(e) => setKm(Number(e.target.value))}
                    placeholder="Ex.: 45"
                    required
                  />
                </label>
              ) : (
                <>
                  <label className="field-label">
                    Odômetro inicial
                    <input
                      className="field tnum"
                      type="number"
                      min="0"
                      step="0.1"
                      value={odometerStart || ""}
                      onChange={(e) => setOdometerStart(Number(e.target.value))}
                      required
                    />
                  </label>
                  <label className="field-label">
                    Odômetro final
                    <input
                      className="field tnum"
                      type="number"
                      min={odometerStart}
                      step="0.1"
                      value={odometerEnd || ""}
                      onChange={(e) => setOdometerEnd(Number(e.target.value))}
                      required
                    />
                    <span className="field-help">
                      Distância calculada: {distanceKm.toLocaleString("pt-BR")} km
                    </span>
                  </label>
                </>
              )}

              <label className="field-label">
                {powertrain === "electric" ? "Consumo (kWh/100 km)" : "Eficiência (km/l)"}
                <input
                  className="field tnum"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={efficiency}
                  onChange={(e) => setEfficiency(Number(e.target.value))}
                />
              </label>

              <label className="field-label">
                {powertrain === "electric" ? "Tarifa (R$/kWh)" : "Preço combustível (R$/l)"}
                <input
                  className="field tnum"
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number(e.target.value))}
                />
              </label>

              <label className="field-label">
                Outros custos (R$)
                <input
                  className="field tnum"
                  type="number"
                  min="0"
                  step="0.01"
                  value={otherCosts || ""}
                  onChange={(e) => setOtherCosts(Number(e.target.value))}
                  placeholder="Pedágio, estacionamento…"
                />
              </label>

              <button type="submit" className="btn-primary min-h-12 sm:col-span-2 lg:col-span-3">
                {saved ? (
                  <>
                    <Check className="size-4" />
                    Registrado
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    Registrar uso
                  </>
                )}
              </button>
            </form>

            {/* Real-time cost panel */}
            <aside className="ios-glass rounded-3xl p-5" aria-live="polite">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-soft">Custo estimado</span>
                <Fuel className="size-5 text-accent" />
              </div>
              <p className="tnum mt-3 text-4xl font-semibold text-ink">
                {formatBRL(totalCost)}
              </p>
              <p className="mt-2 text-xs text-ink-muted">Custo total do trajeto</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-black/[.045] p-3">
                  <p className="text-xs text-ink-muted">Energia / combustível</p>
                  <p className="tnum mt-1 font-semibold text-ink">{formatBRL(energyCost)}</p>
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {energyConsumed.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}{" "}
                    {powertrain === "electric" ? "kWh" : "litros"}
                  </p>
                </div>
                <div className="rounded-2xl bg-black/[.045] p-3">
                  <p className="text-xs text-ink-muted">Custo / km</p>
                  <p className="tnum mt-1 font-semibold text-ink">{formatBRL(costPerKm)}</p>
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {distanceKm.toLocaleString("pt-BR")} km percorridos
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
                <Gauge className="size-4" />
                {distanceKm.toLocaleString("pt-BR")} km · total {formatBRL(totalCost)}
              </div>
            </aside>
          </div>

          {/* Recent entries */}
          <div className="mt-6 border-t border-[var(--color-line)] pt-5">
            <SectionHeader title="Últimos registros" subtitle="Uso recente dos veículos" />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {entries.map((entry, i) => (
                <div
                  key={`${entry.date}-${i}`}
                  className="flex items-center justify-between rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-ink">
                      {entry.date} · {entry.km} km
                    </p>
                  </div>
                  <span className="tnum font-semibold text-ink">{formatBRL(entry.totalCost)}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </BentoGrid>
    </section>
  );
}
