"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, Car, Check, Fuel, Gauge, LoaderCircle, Plus } from "lucide-react";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { VehicleManager, type VehicleRecord } from "@/components/uber/VehicleManager";
import { formatBRL } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { calcEnergyConsumed, calcEnergyCost, type Powertrain } from "@/lib/uberCalc";

type GarageEntry = { id: string; date: string; km: number; totalCost: number };

interface DbEntry {
  id: string;
  occurred_on: string;
  kilometers: number | string;
  energy_or_fuel_cost: number | string;
  other_costs: number | string;
}

function toEntry(item: DbEntry): GarageEntry {
  return {
    id: item.id,
    date: item.occurred_on,
    km: Number(item.kilometers),
    totalCost: Number(item.energy_or_fuel_cost) + Number(item.other_costs),
  };
}

export default function GaragemPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [distanceMode, setDistanceMode] = useState<"distance" | "odometer">("distance");
  const [km, setKm] = useState(0);
  const [odometerStart, setOdometerStart] = useState(0);
  const [odometerEnd, setOdometerEnd] = useState(0);
  const [efficiency, setEfficiency] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);
  const [otherCosts, setOtherCosts] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState<GarageEntry[]>([]);

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
  const powertrain: Powertrain = selectedVehicle?.powertrain ?? "electric";
  const distanceKm = distanceMode === "distance" ? km : Math.max(odometerEnd - odometerStart, 0);
  const energyConsumed = useMemo(() => calcEnergyConsumed(distanceKm, efficiency, powertrain), [distanceKm, efficiency, powertrain]);
  const energyCost = useMemo(() => calcEnergyCost(energyConsumed, unitPrice), [energyConsumed, unitPrice]);
  const totalCost = energyCost + otherCosts;
  const costPerKm = distanceKm > 0 ? totalCost / distanceKm : 0;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthEntries = entries.filter((entry) => entry.date.startsWith(currentMonth));
  const kpiTotalKm = monthEntries.reduce((sum, entry) => sum + entry.km, 0);
  const kpiTotalFuel = monthEntries.reduce((sum, entry) => sum + entry.totalCost, 0);
  const kpiAvgCostKm = kpiTotalKm > 0 ? kpiTotalFuel / kpiTotalKm : 0;

  function selectVehicle(id: string, list = vehicles) {
    setVehicleId(id);
    const selected = list.find((vehicle) => vehicle.id === id);
    setEfficiency(Number(selected?.efficiency ?? 0));
    setUnitPrice(Number(selected?.unit_price ?? 0));
  }

  const loadData = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setLoading(false);
      return;
    }
    const [vehiclesResult, entriesResult] = await Promise.all([
      supabase.from("vehicles").select("id,brand,model,year,state_code,powertrain,efficiency,unit_price,active").eq("active", true).order("year", { ascending: false }),
      supabase.from("uber_daily_entries").select("id,occurred_on,kilometers,energy_or_fuel_cost,other_costs").eq("entry_kind", "garage").order("occurred_on", { ascending: false }).limit(50),
    ]);
    if (vehiclesResult.error) {
      setError("Não foi possível carregar seus veículos.");
    } else {
      const list = (vehiclesResult.data ?? []) as VehicleRecord[];
      setVehicles(list);
      const nextVehicle = list[0];
      setVehicleId(nextVehicle?.id ?? "");
      setEfficiency(Number(nextVehicle?.efficiency ?? 0));
      setUnitPrice(Number(nextVehicle?.unit_price ?? 0));
    }
    if (entriesResult.error) {
      setError(entriesResult.error.code === "42703" || entriesResult.error.code === "PGRST204"
        ? "A atualização do banco para registros da garagem ainda não foi aplicada."
        : "Não foi possível carregar os registros da garagem.");
    } else {
      setEntries(((entriesResult.data ?? []) as DbEntry[]).map(toEntry));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadData(); }, 0);
    const onVehiclesChanged = () => { void loadData(); };
    window.addEventListener("mg-vehicles-changed", onVehiclesChanged);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mg-vehicles-changed", onVehiclesChanged);
    };
  }, [loadData]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setSaving(false);
      return;
    }
    if (!selectedVehicle) {
      setError("Cadastre e selecione um veículo antes de registrar o uso.");
      setSaving(false);
      return;
    }
    if (distanceKm <= 0 || efficiency <= 0 || unitPrice < 0) {
      setError("Informe distância, consumo e preço válidos.");
      setSaving(false);
      return;
    }
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError("Sua sessão expirou. Entre novamente para salvar.");
      setSaving(false);
      return;
    }
    const { data, error: insertError } = await supabase
      .from("uber_daily_entries")
      .insert({
        user_id: userData.user.id,
        vehicle_id: selectedVehicle.id,
        occurred_on: date,
        kilometers: distanceKm,
        gross_revenue: 0,
        consumed_units: energyConsumed,
        energy_or_fuel_cost: energyCost,
        other_costs: otherCosts,
        net_profit: -totalCost,
        idempotency_key: crypto.randomUUID(),
        entry_kind: "garage",
        hours_worked: null,
        odometer_start: distanceMode === "odometer" ? odometerStart : null,
        odometer_end: distanceMode === "odometer" ? odometerEnd : null,
      })
      .select("id,occurred_on,kilometers,energy_or_fuel_cost,other_costs")
      .single();
    if (insertError || !data) {
      setError(insertError?.code === "42703" || insertError?.code === "PGRST204"
        ? "A atualização do banco para registros da garagem ainda não foi aplicada."
        : "Não foi possível registrar o uso. Tente novamente.");
      setSaving(false);
      return;
    }
    setEntries((current) => [toEntry(data as DbEntry), ...current].slice(0, 50));
    setSaved(true);
    setSaving(false);
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <section aria-labelledby="garagem-heading" className="flex flex-col gap-5 animate-[gz-rise_0.45s_ease-out_both]">
      <PageHeader eyebrow="Veículos" title="Garagem" description="Controle de veículos, consumo de combustível e manutenção." />
      <BentoGrid>
        <KpiCard className="col-span-12 sm:col-span-6 lg:col-span-3" label="Total km este mês" value={`${kpiTotalKm.toLocaleString("pt-BR")} km`} tone="neutral" icon={<Gauge className="h-4 w-4" />} hint="Quilometragem acumulada no mês" />
        <KpiCard className="col-span-12 sm:col-span-6 lg:col-span-3" label="Custo médio/km" value={formatBRL(kpiAvgCostKm)} tone="neutral" icon={<Calculator className="h-4 w-4" />} hint="Média ponderada do mês" />
        <KpiCard className="col-span-12 sm:col-span-6 lg:col-span-3" label="Total em combustível" value={formatBRL(kpiTotalFuel)} tone="neg" icon={<Fuel className="h-4 w-4" />} hint="Soma de energia/combustível no mês" />
        <KpiCard className="col-span-12 sm:col-span-6 lg:col-span-3" label="Veículos cadastrados" value={String(vehicles.length)} tone="neutral" icon={<Car className="h-4 w-4" />} hint="Ativos na garagem" />
        <VehicleManager />

        <GlassCard variant="liquid" className="col-span-12 p-6 lg:p-7">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-accent">Registro diário</p><h3 className="mt-1 text-lg font-semibold text-ink">Registrar uso do veículo</h3><p className="mt-1 text-sm text-ink-muted">Informe a rodagem e custos; o gasto total é calculado automaticamente.</p></div><span className="ios-glass inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs text-ink-soft"><Calculator className="size-4 text-accent" />Cálculo em tempo real</span></div>
          <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
            <form onSubmit={submit} className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <label className="field-label">Data<input className="field" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
              <label className="field-label sm:col-span-2">Veículo<select className="field" value={vehicleId} onChange={(event) => selectVehicle(event.target.value)} disabled={loading || vehicles.length === 0} required><option value="">{vehicles.length === 0 ? "Cadastre um veículo acima" : "Selecione"}</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.brand} {vehicle.model} · {vehicle.year}</option>)}</select></label>
              <fieldset className="sm:col-span-2 lg:col-span-1"><legend className="field-label">Distância</legend><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" aria-pressed={distanceMode === "distance"} onClick={() => setDistanceMode("distance")} className={`min-h-11 rounded-xl border text-sm font-semibold ${distanceMode === "distance" ? "border-accent bg-accent/10 text-ink" : "border-[var(--color-line)] text-ink-soft"}`}>Km</button><button type="button" aria-pressed={distanceMode === "odometer"} onClick={() => setDistanceMode("odometer")} className={`min-h-11 rounded-xl border text-sm font-semibold ${distanceMode === "odometer" ? "border-accent bg-accent/10 text-ink" : "border-[var(--color-line)] text-ink-soft"}`}>Odômetro</button></div></fieldset>
              {distanceMode === "distance" ? <label className="field-label">Quilômetros rodados<input className="field tnum" type="number" min="0.1" step="0.1" value={km || ""} onChange={(event) => setKm(Number(event.target.value))} placeholder="Ex.: 45" required /></label> : <><label className="field-label">Odômetro inicial<input className="field tnum" type="number" min="0" step="0.1" value={odometerStart || ""} onChange={(event) => setOdometerStart(Number(event.target.value))} required /></label><label className="field-label">Odômetro final<input className="field tnum" type="number" min={odometerStart} step="0.1" value={odometerEnd || ""} onChange={(event) => setOdometerEnd(Number(event.target.value))} required /><span className="field-help">Distância calculada: {distanceKm.toLocaleString("pt-BR")} km</span></label></>}
              <label className="field-label">{powertrain === "electric" ? "Consumo (kWh/100 km)" : "Eficiência (km/l)"}<input className="field tnum" type="number" min="0.1" step="0.1" value={efficiency || ""} onChange={(event) => setEfficiency(Number(event.target.value))} required /></label>
              <label className="field-label">{powertrain === "electric" ? "Tarifa (R$/kWh)" : "Preço combustível (R$/l)"}<input className="field tnum" type="number" min="0" step="0.01" value={unitPrice || ""} onChange={(event) => setUnitPrice(Number(event.target.value))} required /></label>
              <label className="field-label">Outros custos (R$)<input className="field tnum" type="number" min="0" step="0.01" value={otherCosts || ""} onChange={(event) => setOtherCosts(Number(event.target.value))} placeholder="Pedágio, estacionamento…" /></label>
              {error && <p role="alert" className="rounded-2xl bg-rose-400/10 p-3 text-sm text-neg sm:col-span-2 lg:col-span-3">{error}</p>}
              <button type="submit" className="btn-primary min-h-12 sm:col-span-2 lg:col-span-3" disabled={saving || vehicles.length === 0}>{saving ? <><LoaderCircle className="size-4 animate-spin" />Salvando...</> : saved ? <><Check className="size-4" />Registrado</> : <><Plus className="size-4" />Registrar uso</>}</button>
            </form>
            <aside className="ios-glass rounded-3xl p-5" aria-live="polite"><div className="flex items-center justify-between"><span className="text-sm font-medium text-ink-soft">Custo estimado</span><Fuel className="size-5 text-accent" /></div><p className="tnum mt-3 text-4xl font-semibold text-ink">{formatBRL(totalCost)}</p><p className="mt-2 text-xs text-ink-muted">Custo total do trajeto</p><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-black/[.045] p-3"><p className="text-xs text-ink-muted">Energia / combustível</p><p className="tnum mt-1 font-semibold text-ink">{formatBRL(energyCost)}</p><p className="mt-1 text-[11px] text-ink-muted">{energyConsumed.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} {powertrain === "electric" ? "kWh" : "litros"}</p></div><div className="rounded-2xl bg-black/[.045] p-3"><p className="text-xs text-ink-muted">Custo / km</p><p className="tnum mt-1 font-semibold text-ink">{formatBRL(costPerKm)}</p><p className="mt-1 text-[11px] text-ink-muted">{distanceKm.toLocaleString("pt-BR")} km percorridos</p></div></div></aside>
          </div>
          <div className="mt-6 border-t border-[var(--color-line)] pt-5"><SectionHeader title="Últimos registros" subtitle="Uso recente dos veículos" />{loading ? <p className="py-8 text-center text-sm text-ink-muted">Carregando registros...</p> : entries.length === 0 ? <p className="mt-3 rounded-2xl border border-dashed border-[var(--color-line)] py-8 text-center text-sm text-ink-muted">Nenhum uso registrado.</p> : <div className="mt-3 grid gap-2 sm:grid-cols-2">{entries.slice(0, 6).map((entry) => <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm"><p className="font-medium text-ink">{new Date(`${entry.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · {entry.km} km</p><span className="tnum font-semibold text-ink">{formatBRL(entry.totalCost)}</span></div>)}</div>}</div>
        </GlassCard>
      </BentoGrid>
    </section>
  );
}
