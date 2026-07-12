"use client";

import { useMemo, useState } from "react";
import { Calculator, Check, Gauge, Plus, TrendingUp } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatBRL } from "@/lib/format";

type Entry = { date: string; km: number; revenue: number; costs: number; profit: number };

export function DailyUberEntry() {
  const [powertrain, setPowertrain] = useState<"electric" | "hybrid" | "combustion">("electric");
  const [distanceMode, setDistanceMode] = useState<"distance" | "odometer">("distance");
  const [km, setKm] = useState(0);
  const [odometerStart, setOdometerStart] = useState(0);
  const [odometerEnd, setOdometerEnd] = useState(0);
  const [hours, setHours] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [efficiency, setEfficiency] = useState(15.2);
  const [unitPrice, setUnitPrice] = useState(0.94);
  const [other, setOther] = useState(0);
  const [saved, setSaved] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([{ date: "10/07", km: 186, revenue: 379, costs: 108, profit: 271 }]);
  const distanceKm = distanceMode === "distance" ? km : Math.max(odometerEnd - odometerStart, 0);
  const energyConsumed = powertrain === "electric" ? (distanceKm * efficiency) / 100 : efficiency > 0 ? distanceKm / efficiency : 0;
  const energy = energyConsumed * unitPrice;
  const totalCosts = energy + other;
  const profit = useMemo(() => revenue - totalCosts, [revenue, totalCosts]);
  const profitPerKm = distanceKm > 0 ? profit / distanceKm : 0;
  const profitPerHour = hours > 0 ? profit / hours : 0;
  const averageProfit = 271;
  const profitTrend = averageProfit > 0 ? (profit - averageProfit) / averageProfit : 0;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEntries((current) => [{ date: "11/07", km: distanceKm, revenue, costs: totalCosts, profit }, ...current].slice(0, 3));
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <GlassCard className="col-span-12 p-6 lg:p-7">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-accent">Diário de trabalho</p><h3 className="mt-1 text-lg font-semibold text-ink">Registrar dia na Uber</h3><p className="mt-1 text-sm text-ink-muted">Informe a rodagem e os ganhos; o lucro é calculado automaticamente.</p></div><span className="ios-glass inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs text-ink-soft"><Calculator className="size-4 text-accent" />Cálculo em tempo real</span></div>
      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <form onSubmit={submit} className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <label className="field-label">Data<input className="field" type="date" defaultValue="2026-07-11" required /></label>
          <fieldset className="sm:col-span-2 lg:col-span-2"><legend className="field-label">Como informar a distância?</legend><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" aria-pressed={distanceMode === "distance"} onClick={() => setDistanceMode("distance")} className={`min-h-11 rounded-xl border text-sm font-semibold ${distanceMode === "distance" ? "border-accent bg-indigo-500/10 text-ink" : "border-[var(--color-line)] text-ink-soft"}`}>Quilômetros</button><button type="button" aria-pressed={distanceMode === "odometer"} onClick={() => setDistanceMode("odometer")} className={`min-h-11 rounded-xl border text-sm font-semibold ${distanceMode === "odometer" ? "border-accent bg-indigo-500/10 text-ink" : "border-[var(--color-line)] text-ink-soft"}`}>Odômetro</button></div></fieldset>
          {distanceMode === "distance" ? <label className="field-label">Quilômetros rodados<input className="field tnum" type="number" min="0" step="0.1" value={km || ""} onChange={(event) => setKm(Number(event.target.value))} placeholder="Ex.: 180" required /></label> : <><label className="field-label">Odômetro inicial<input className="field tnum" type="number" min="0" step="0.1" value={odometerStart || ""} onChange={(event) => setOdometerStart(Number(event.target.value))} required /></label><label className="field-label">Odômetro final<input className="field tnum" type="number" min={odometerStart} step="0.1" value={odometerEnd || ""} onChange={(event) => setOdometerEnd(Number(event.target.value))} required /><span className="field-help">Distância calculada: {distanceKm.toLocaleString("pt-BR")} km</span></label></>}
          <label className="field-label">Receita bruta (R$)<input className="field tnum" type="number" min="0" step="0.01" value={revenue || ""} onChange={(event) => setRevenue(Number(event.target.value))} placeholder="0,00" required /></label>
          <label className="field-label">Veículo / motorização<select className="field" value={powertrain} onChange={(event) => { const next = event.target.value as typeof powertrain; setPowertrain(next); setEfficiency(next === "electric" ? 15.2 : 11.5); setUnitPrice(next === "electric" ? 0.94 : 6.19); }}><option value="electric">BYD Dolphin · elétrico</option><option value="hybrid">Toyota Corolla · híbrido</option><option value="combustion">Chevrolet Onix · combustão</option></select></label>
          <label className="field-label">{powertrain === "electric" ? "Consumo (kWh/100 km)" : "Eficiência (km/l)"}<input className="field tnum" type="number" min="0.1" step="0.1" value={efficiency} onChange={(event) => setEfficiency(Number(event.target.value))} /></label>
          <label className="field-label">{powertrain === "electric" ? "Tarifa (R$/kWh)" : "Preço do combustível (R$/l)"}<input className="field tnum" type="number" min="0" step="0.01" value={unitPrice} onChange={(event) => setUnitPrice(Number(event.target.value))} /></label>
          <label className="field-label">Outros custos (R$)<input className="field tnum" type="number" min="0" step="0.01" value={other || ""} onChange={(event) => setOther(Number(event.target.value))} placeholder="0,00" /></label>
          <label className="field-label">Horas trabalhadas<input className="field tnum" type="number" min="0" step="0.25" value={hours || ""} onChange={(event) => setHours(Number(event.target.value))} placeholder="Ex.: 8" /></label>
          <button type="submit" className="btn-primary min-h-12 sm:col-span-2 lg:col-span-3">{saved ? <><Check className="size-4" />Dia registrado</> : <><Plus className="size-4" />Adicionar ao diário</>}</button>
        </form>
        <aside className="ios-glass rounded-3xl p-5" aria-live="polite"><div className="flex items-center justify-between"><span className="text-sm font-medium text-ink-soft">Lucro estimado</span><TrendingUp className={`size-5 ${profit >= 0 ? "text-pos" : "text-neg"}`} /></div><p className={`tnum mt-3 text-4xl font-semibold ${profit >= 0 ? "text-pos" : "text-neg"}`}>{formatBRL(profit)}</p><p className={`mt-2 text-xs font-semibold ${profitTrend >= 0 ? "text-pos" : "text-neg"}`}>{profitTrend >= 0 ? "+" : ""}{(profitTrend * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs. média de 7 dias</p><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-black/[.045] p-3"><p className="text-xs text-ink-muted">Energia / combustível</p><p className="tnum mt-1 font-semibold text-ink">{formatBRL(energy)}</p><p className="mt-1 text-[11px] text-ink-muted">{energyConsumed.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} {powertrain === "electric" ? "kWh" : "litros"}</p></div><div className="rounded-2xl bg-black/[.045] p-3"><p className="text-xs text-ink-muted">Lucro / km</p><p className="tnum mt-1 font-semibold text-ink">{formatBRL(profitPerKm)}</p><p className="mt-1 text-[11px] text-ink-muted">Lucro / hora {formatBRL(profitPerHour)}</p></div></div><div className="mt-4 flex items-center gap-2 text-xs text-ink-muted"><Gauge className="size-4" />{distanceKm.toLocaleString("pt-BR")} km · custo total {formatBRL(totalCosts)}</div></aside>
      </div>
      <div className="mt-6 border-t border-[var(--color-line)] pt-5"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">Últimos registros</p><div className="grid gap-2 sm:grid-cols-2">{entries.map((entry, index) => <div key={`${entry.date}-${index}`} className="flex items-center justify-between rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm"><div><p className="font-medium text-ink">{entry.date} · {entry.km} km</p><p className="text-xs text-ink-muted">Receita {formatBRL(entry.revenue)} · custos {formatBRL(entry.costs)}</p></div><span className="tnum font-semibold text-pos">{formatBRL(entry.profit)}</span></div>)}</div></div>
    </GlassCard>
  );
}
