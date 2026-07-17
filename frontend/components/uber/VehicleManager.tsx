"use client";

import { useEffect, useMemo, useState } from "react";
import { BatteryCharging, CarFront, Check, Fuel, LoaderCircle, Zap } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatBRL } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { calcEnergyConsumed, calcEnergyCost, type Powertrain } from "@/lib/uberCalc";

export interface VehicleRecord {
  id: string;
  brand: string;
  model: string;
  year: number;
  state_code: string;
  powertrain: Powertrain;
  efficiency: number | string | null;
  unit_price: number | string | null;
  active: boolean;
}

const STATES = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

export function VehicleManager() {
  const [powertrain, setPowertrain] = useState<Powertrain>("electric");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [efficiency, setEfficiency] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const estimatedUnits = useMemo(
    () => calcEnergyConsumed(100, efficiency, powertrain),
    [efficiency, powertrain],
  );
  const estimatedCost = useMemo(
    () => calcEnergyCost(estimatedUnits, unitPrice),
    [estimatedUnits, unitPrice],
  );
  const currentVehicle = vehicles[0];

  async function loadVehicles() {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setLoading(false);
      return;
    }
    const { data, error: loadError } = await supabase
      .from("vehicles")
      .select("id,brand,model,year,state_code,powertrain,efficiency,unit_price,active")
      .eq("active", true)
      .order("year", { ascending: false });
    if (loadError) {
      setError("Não foi possível carregar seus veículos.");
    } else {
      setVehicles((data ?? []) as VehicleRecord[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadVehicles(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

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
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError("Sua sessão expirou. Entre novamente para salvar.");
      setSaving(false);
      return;
    }

    const parsedYear = Number(year);
    if (!stateCode || !Number.isInteger(parsedYear) || efficiency <= 0 || unitPrice < 0) {
      setError("Preencha estado, ano, consumo e preço com valores válidos.");
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("vehicles")
      .insert({
        user_id: userData.user.id,
        brand: brand.trim(),
        model: model.trim(),
        year: parsedYear,
        state_code: stateCode,
        powertrain,
        efficiency,
        unit_price: unitPrice,
        active: true,
      })
      .select("id,brand,model,year,state_code,powertrain,efficiency,unit_price,active")
      .single();

    if (insertError || !data) {
      setError("Não foi possível salvar o veículo. Tente novamente.");
      setSaving(false);
      return;
    }

    setVehicles((current) => [data as VehicleRecord, ...current]);
    setBrand("");
    setModel("");
    setYear("");
    setStateCode("");
    setSaved(true);
    setSaving(false);
    window.dispatchEvent(new CustomEvent("mg-vehicles-changed"));
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <GlassCard variant="hero" className="col-span-12 overflow-hidden">
      <div className="grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-cyan-400/10 text-accent-2"><CarFront className="size-5" /></span>
            <div><h3 className="font-semibold text-ink">Sua garagem</h3><p className="text-sm text-ink-muted">Veículos disponíveis nos registros</p></div>
          </div>
          <div className="ios-glass mt-5 rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-accent-2">
                {currentVehicle ? (currentVehicle.powertrain === "electric" ? "Elétrico" : currentVehicle.powertrain === "hybrid" ? "Híbrido" : "Combustão") : "Novo veículo"}
              </span>
              <BatteryCharging className="size-5 text-accent-2" />
            </div>
            <p className="mt-8 text-xl font-semibold text-ink">
              {currentVehicle ? `${currentVehicle.brand} ${currentVehicle.model}` : "Nenhum veículo cadastrado"}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {loading ? "Carregando..." : currentVehicle ? `Ano ${currentVehicle.year} · ${vehicles.length} ativo${vehicles.length === 1 ? "" : "s"}` : "Use o formulário para cadastrar o primeiro."}
            </p>
            <div className="mt-6 border-t border-[var(--color-line)] pt-4">
              <p className="text-xs text-ink-muted">Custo estimado a cada 100 km</p>
              <p className="tnum mt-1 text-2xl font-semibold text-ink">{formatBRL(estimatedCost)}</p>
              <p className="mt-1 text-xs text-ink-muted">Estimativa do novo veículo com o consumo informado.</p>
            </div>
          </div>
        </div>

        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <label className="field-label">Marca<input className="field" name="brand" value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Ex.: Fiat" required /></label>
          <label className="field-label">Modelo<input className="field" name="model" value={model} onChange={(event) => setModel(event.target.value)} placeholder="Ex.: Argo" required /></label>
          <label className="field-label">Ano<input className="field" name="year" type="number" min="1980" max={new Date().getFullYear() + 1} value={year} onChange={(event) => setYear(event.target.value)} placeholder="Ex.: 2024" required /></label>
          <label className="field-label">Estado (UF)<select className="field" name="state" value={stateCode} onChange={(event) => setStateCode(event.target.value)} required><option value="" disabled>Selecione</option>{STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
          <fieldset className="sm:col-span-2"><legend className="field-label">Motorização</legend><div className="mt-2 grid grid-cols-3 gap-2">{([{ id: "combustion", label: "Combustão", icon: Fuel }, { id: "hybrid", label: "Híbrido", icon: Zap }, { id: "electric", label: "Elétrico", icon: BatteryCharging }] as const).map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => { setPowertrain(id); setEfficiency(0); setUnitPrice(0); }} aria-pressed={powertrain === id} className={`rounded-2xl border p-3 text-xs font-semibold ${powertrain === id ? "border-cyan-400/50 bg-cyan-400/10 text-ink" : "border-[var(--color-line)] text-ink-muted"}`}><Icon className="mx-auto mb-1 size-4" />{label}</button>)}</div></fieldset>
          <label className="field-label">{powertrain === "electric" ? "Consumo (kWh/100 km)" : "Eficiência (km/l)"}<input className="field tnum" type="number" min="0.1" step="0.01" value={efficiency || ""} onChange={(event) => setEfficiency(Number(event.target.value))} required /></label>
          <label className="field-label">{powertrain === "electric" ? "Tarifa (R$/kWh)" : "Preço do combustível (R$/l)"}<input className="field tnum" type="number" min="0" step="0.01" value={unitPrice || ""} onChange={(event) => setUnitPrice(Number(event.target.value))} required /></label>
          {error && <p role="alert" className="rounded-2xl bg-rose-400/10 p-3 text-sm text-neg sm:col-span-2">{error}</p>}
          <button type="submit" className="btn-primary sm:col-span-2" disabled={saving}>
            {saving ? <><LoaderCircle className="size-4 animate-spin" />Salvando...</> : saved ? <><Check className="size-4" />Veículo salvo</> : <><CarFront className="size-4" />Salvar veículo</>}
          </button>
        </form>
      </div>
    </GlassCard>
  );
}
