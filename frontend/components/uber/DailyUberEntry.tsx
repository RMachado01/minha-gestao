"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, Check, Gauge, LoaderCircle, Plus, TrendingUp } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatBRL } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { calcEnergyConsumed, calcEnergyCost, type Powertrain } from "@/lib/uberCalc";
import type { VehicleRecord } from "@/components/uber/VehicleManager";

type Entry = {
  id: string;
  date: string;
  km: number;
  revenue: number;
  costs: number;
  profit: number;
};

interface DbEntry {
  id: string;
  occurred_on: string;
  kilometers: number | string;
  gross_revenue: number | string;
  energy_or_fuel_cost: number | string;
  other_costs: number | string;
  net_profit: number | string;
}

function toEntry(item: DbEntry): Entry {
  return {
    id: item.id,
    date: item.occurred_on,
    km: Number(item.kilometers),
    revenue: Number(item.gross_revenue),
    costs: Number(item.energy_or_fuel_cost) + Number(item.other_costs),
    profit: Number(item.net_profit),
  };
}

export function DailyUberEntry() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [vehicleId, setVehicleId] = useState("");
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [distanceMode, setDistanceMode] = useState<"distance" | "odometer">("distance");
  const [km, setKm] = useState(0);
  const [odometerStart, setOdometerStart] = useState(0);
  const [odometerEnd, setOdometerEnd] = useState(0);
  const [hours, setHours] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [efficiency, setEfficiency] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);
  const [other, setOther] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
  const powertrain: Powertrain = selectedVehicle?.powertrain ?? "electric";
  const distanceKm = distanceMode === "distance" ? km : Math.max(odometerEnd - odometerStart, 0);
  const energyConsumed = calcEnergyConsumed(distanceKm, efficiency, powertrain);
  const energy = calcEnergyCost(energyConsumed, unitPrice);
  const totalCosts = energy + other;
  const profit = useMemo(() => revenue - totalCosts, [revenue, totalCosts]);
  const profitPerKm = distanceKm > 0 ? profit / distanceKm : 0;
  const profitPerHour = hours > 0 ? profit / hours : 0;
  const averageProfit = entries.length > 0 ? entries.reduce((sum, entry) => sum + entry.profit, 0) / entries.length : 0;
  const profitTrend = averageProfit > 0 ? (profit - averageProfit) / averageProfit : 0;

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
      supabase.from("uber_daily_entries").select("id,occurred_on,kilometers,gross_revenue,energy_or_fuel_cost,other_costs,net_profit").eq("entry_kind", "uber").order("occurred_on", { ascending: false }).limit(7),
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
        ? "A atualização do banco para o diário ainda não foi aplicada."
        : "Não foi possível carregar o diário de trabalho.");
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
      setError("Cadastre e selecione um veículo antes de registrar o dia.");
      setSaving(false);
      return;
    }
    if (distanceKm <= 0 || efficiency <= 0 || revenue < 0 || hours < 0) {
      setError("Informe distância, consumo, receita e horas válidos.");
      setSaving(false);
      return;
    }
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError("Sua sessão expirou. Entre novamente para salvar.");
      setSaving(false);
      return;
    }

    const payload = {
      user_id: userData.user.id,
      vehicle_id: selectedVehicle.id,
      occurred_on: date,
      kilometers: distanceKm,
      gross_revenue: revenue,
      consumed_units: energyConsumed,
      energy_or_fuel_cost: energy,
      other_costs: other,
      net_profit: profit,
      idempotency_key: crypto.randomUUID(),
      entry_kind: "uber",
      hours_worked: hours || null,
      odometer_start: distanceMode === "odometer" ? odometerStart : null,
      odometer_end: distanceMode === "odometer" ? odometerEnd : null,
    };
    const { data, error: insertError } = await supabase
      .from("uber_daily_entries")
      .insert(payload)
      .select("id,occurred_on,kilometers,gross_revenue,energy_or_fuel_cost,other_costs,net_profit")
      .single();

    if (insertError || !data) {
      setError(insertError?.code === "42703" || insertError?.code === "PGRST204"
        ? "A atualização do banco para o diário ainda não foi aplicada."
        : "Não foi possível registrar o dia. Tente novamente.");
      setSaving(false);
      return;
    }

    setEntries((current) => [toEntry(data as DbEntry), ...current].slice(0, 7));
    setSaved(true);
    setSaving(false);
    window.dispatchEvent(new CustomEvent("mg-uber-entries-changed"));
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <GlassCard variant="liquid" className="col-span-12 p-6 lg:p-7">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-accent">Diário de trabalho</p><h3 className="mt-1 text-lg font-semibold text-ink">Registrar dia na Uber</h3><p className="mt-1 text-sm text-ink-muted">Informe a rodagem e os ganhos; o lucro é calculado automaticamente.</p></div><span className="ios-glass inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs text-ink-soft"><Calculator className="size-4 text-accent" />Cálculo em tempo real</span></div>
      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <form onSubmit={submit} className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <label className="field-label">Data<input className="field" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
          <label className="field-label sm:col-span-2">Veículo<select className="field" value={vehicleId} onChange={(event) => selectVehicle(event.target.value)} disabled={loading || vehicles.length === 0} required><option value="">{vehicles.length === 0 ? "Cadastre um veículo acima" : "Selecione"}</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.brand} {vehicle.model} · {vehicle.year}</option>)}</select></label>
          <fieldset className="sm:col-span-2 lg:col-span-2"><legend className="field-label">Como informar a distância?</legend><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" aria-pressed={distanceMode === "distance"} onClick={() => setDistanceMode("distance")} className={`min-h-11 rounded-xl border text-sm font-semibold ${distanceMode === "distance" ? "border-accent bg-accent/10 text-ink" : "border-[var(--color-line)] text-ink-soft"}`}>Quilômetros</button><button type="button" aria-pressed={distanceMode === "odometer"} onClick={() => setDistanceMode("odometer")} className={`min-h-11 rounded-xl border text-sm font-semibold ${distanceMode === "odometer" ? "border-accent bg-accent/10 text-ink" : "border-[var(--color-line)] text-ink-soft"}`}>Odômetro</button></div></fieldset>
          {distanceMode === "distance" ? <label className="field-label">Quilômetros rodados<input className="field tnum" type="number" min="0.1" step="0.1" value={km || ""} onChange={(event) => setKm(Number(event.target.value))} placeholder="Ex.: 180" required /></label> : <><label className="field-label">Odômetro inicial<input className="field tnum" type="number" min="0" step="0.1" value={odometerStart || ""} onChange={(event) => setOdometerStart(Number(event.target.value))} required /></label><label className="field-label">Odômetro final<input className="field tnum" type="number" min={odometerStart} step="0.1" value={odometerEnd || ""} onChange={(event) => setOdometerEnd(Number(event.target.value))} required /><span className="field-help">Distância calculada: {distanceKm.toLocaleString("pt-BR")} km</span></label></>}
          <label className="field-label">Receita bruta (R$)<input className="field tnum" type="number" min="0" step="0.01" value={revenue || ""} onChange={(event) => setRevenue(Number(event.target.value))} placeholder="0,00" required /></label>
          <label className="field-label">{powertrain === "electric" ? "Consumo (kWh/100 km)" : "Eficiência (km/l)"}<input className="field tnum" type="number" min="0.1" step="0.1" value={efficiency || ""} onChange={(event) => setEfficiency(Number(event.target.value))} required /></label>
          <label className="field-label">{powertrain === "electric" ? "Tarifa (R$/kWh)" : "Preço do combustível (R$/l)"}<input className="field tnum" type="number" min="0" step="0.01" value={unitPrice || ""} onChange={(event) => setUnitPrice(Number(event.target.value))} required /></label>
          <label className="field-label">Outros custos (R$)<input className="field tnum" type="number" min="0" step="0.01" value={other || ""} onChange={(event) => setOther(Number(event.target.value))} placeholder="0,00" /></label>
          <label className="field-label">Horas trabalhadas<input className="field tnum" type="number" min="0" step="0.25" value={hours || ""} onChange={(event) => setHours(Number(event.target.value))} placeholder="Ex.: 8" /></label>
          {error && <p role="alert" className="rounded-2xl bg-rose-400/10 p-3 text-sm text-neg sm:col-span-2 lg:col-span-3">{error}</p>}
          <button type="submit" className="btn-primary min-h-12 sm:col-span-2 lg:col-span-3" disabled={saving || vehicles.length === 0}>{saving ? <><LoaderCircle className="size-4 animate-spin" />Salvando...</> : saved ? <><Check className="size-4" />Dia registrado</> : <><Plus className="size-4" />Adicionar ao diário</>}</button>
        </form>
        <aside className="ios-glass rounded-3xl p-5" aria-live="polite"><div className="flex items-center justify-between"><span className="text-sm font-medium text-ink-soft">Lucro estimado</span><TrendingUp className={`size-5 ${profit >= 0 ? "text-pos" : "text-neg"}`} /></div><p className={`tnum mt-3 text-4xl font-semibold ${profit >= 0 ? "text-pos" : "text-neg"}`}>{formatBRL(profit)}</p><p className={`mt-2 text-xs font-semibold ${profitTrend >= 0 ? "text-pos" : "text-neg"}`}>{profitTrend >= 0 ? "+" : ""}{(profitTrend * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs. últimos registros</p><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-black/[.045] p-3"><p className="text-xs text-ink-muted">Energia / combustível</p><p className="tnum mt-1 font-semibold text-ink">{formatBRL(energy)}</p><p className="mt-1 text-[11px] text-ink-muted">{energyConsumed.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} {powertrain === "electric" ? "kWh" : "litros"}</p></div><div className="rounded-2xl bg-black/[.045] p-3"><p className="text-xs text-ink-muted">Lucro / km</p><p className="tnum mt-1 font-semibold text-ink">{formatBRL(profitPerKm)}</p><p className="mt-1 text-[11px] text-ink-muted">Lucro / hora {formatBRL(profitPerHour)}</p></div></div><div className="mt-4 flex items-center gap-2 text-xs text-ink-muted"><Gauge className="size-4" />{distanceKm.toLocaleString("pt-BR")} km · custo total {formatBRL(totalCosts)}</div></aside>
      </div>
      <div className="mt-6 border-t border-[var(--color-line)] pt-5"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">Últimos registros</p>{loading ? <p className="py-8 text-center text-sm text-ink-muted">Carregando diário...</p> : entries.length === 0 ? <p className="rounded-2xl border border-dashed border-[var(--color-line)] py-8 text-center text-sm text-ink-muted">Nenhum dia de trabalho registrado.</p> : <div className="grid gap-2 sm:grid-cols-2">{entries.map((entry) => <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm"><div><p className="font-medium text-ink">{new Date(`${entry.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · {entry.km} km</p><p className="text-xs text-ink-muted">Receita {formatBRL(entry.revenue)} · custos {formatBRL(entry.costs)}</p></div><span className={`tnum font-semibold ${entry.profit >= 0 ? "text-pos" : "text-neg"}`}>{formatBRL(entry.profit)}</span></div>)}</div>}</div>
    </GlassCard>
  );
}
