"use client";

import { useMemo, useState } from "react";
import { BatteryCharging, CarFront, Check, Fuel, Zap } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatBRL } from "@/lib/format";

type Powertrain = "combustion" | "hybrid" | "electric";

export function VehicleManager() {
  const [powertrain, setPowertrain] = useState<Powertrain>("electric");
  const [kwh, setKwh] = useState(184);
  const [tariff, setTariff] = useState(0.94);
  const [saved, setSaved] = useState(false);
  const electricityCost = useMemo(() => kwh * tariff, [kwh, tariff]);
  const showElectricity = powertrain !== "combustion";

  return (
    <GlassCard className="col-span-12 overflow-hidden" strong>
      <div className="grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-cyan-400/10 text-accent-2"><CarFront className="size-5" /></span><div><h3 className="font-semibold text-ink">Garagem Uber</h3><p className="text-sm text-ink-muted">Veículo usado nas corridas</p></div></div>
          <div className="ios-glass mt-5 rounded-3xl p-5"><div className="flex items-center justify-between"><span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-accent-2">{powertrain === "electric" ? "Elétrico" : powertrain === "hybrid" ? "Híbrido" : "Combustão"}</span><BatteryCharging className="size-5 text-accent-2" /></div><p className="mt-8 text-xl font-semibold text-ink">BYD Dolphin GS</p><p className="mt-1 text-sm text-ink-muted">2025 · São Paulo</p>{showElectricity && <div className="mt-6 border-t border-[var(--color-line)] pt-4"><p className="text-xs text-ink-muted">Energia estimada no período</p><p className="tnum mt-1 text-2xl font-semibold text-ink">{formatBRL(electricityCost)}</p><p className="mt-1 text-xs text-ink-muted">{kwh.toLocaleString("pt-BR")} kWh × {formatBRL(tariff)}/kWh</p></div>}</div>
        </div>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 2200); }}>
          <label className="text-sm font-medium text-ink-soft">Marca<input className="field mt-2" name="brand" defaultValue="BYD" required /></label>
          <label className="text-sm font-medium text-ink-soft">Modelo<input className="field mt-2" name="model" defaultValue="Dolphin GS" required /></label>
          <label className="text-sm font-medium text-ink-soft">Ano<input className="field mt-2" name="year" type="number" min="1980" max="2030" defaultValue="2025" required /></label>
          <label className="text-sm font-medium text-ink-soft">Estado (UF)<select className="field mt-2" name="state" defaultValue="SP"><option>SP</option><option>RJ</option><option>MG</option><option>PR</option><option>SC</option><option>RS</option><option>BA</option><option>PE</option><option>DF</option></select></label>
          <fieldset className="sm:col-span-2"><legend className="text-sm font-medium text-ink-soft">Motorização</legend><div className="mt-2 grid grid-cols-3 gap-2">{([{ id: "combustion", label: "Combustão", icon: Fuel }, { id: "hybrid", label: "Híbrido", icon: Zap }, { id: "electric", label: "Elétrico", icon: BatteryCharging }] as const).map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setPowertrain(id)} aria-pressed={powertrain === id} className={`rounded-2xl border p-3 text-xs font-semibold ${powertrain === id ? "border-cyan-400/50 bg-cyan-400/10 text-ink" : "border-[var(--color-line)] text-ink-muted"}`}><Icon className="mx-auto mb-1 size-4" />{label}</button>)}</div></fieldset>
          {showElectricity && <><label className="text-sm font-medium text-ink-soft">Consumo no período (kWh)<input className="field mt-2 tnum" type="number" min="0" step="0.01" value={kwh} onChange={(event) => setKwh(Number(event.target.value))} /></label><label className="text-sm font-medium text-ink-soft">Tarifa efetiva (R$/kWh)<input className="field mt-2 tnum" type="number" min="0" step="0.01" value={tariff} onChange={(event) => setTariff(Number(event.target.value))} /><span className="mt-1 block text-xs font-normal text-ink-muted">Informe a tarifa total da conta da distribuidora.</span></label></>}
          <button type="submit" className="btn-primary sm:col-span-2">{saved ? <><Check className="size-4" />Veículo salvo</> : <><CarFront className="size-4" />Salvar veículo</>}</button>
        </form>
      </div>
    </GlassCard>
  );
}
