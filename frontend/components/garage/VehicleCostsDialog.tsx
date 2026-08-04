"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Coins, LoaderCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { formatBRL } from "@/lib/format";
import { fixedCosts } from "@/lib/vehicleCosts";
import type { GarageVehicle } from "@/lib/supabase/useGarage";

/**
 * Edita os custos de propriedade do veículo (o que não aparece na bomba):
 * valor de compra + depreciação, IPVA, seguro e licenciamento.
 */
/**
 * Formulário interno: o estado nasce dos dados do veículo. O componente é
 * remontado por `key` quando o veículo muda, então não há efeito de
 * sincronização.
 */
function CostsForm({ vehicle, onClose, onSaved }: {
  vehicle: GarageVehicle;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [plate, setPlate] = useState(vehicle.plate ?? "");
  const [odometer, setOdometer] = useState(String(Math.round(vehicle.odometer) || ""));
  const [purchasePrice, setPurchasePrice] = useState(vehicle.purchase_price ?? 0);
  const [depreciationRate, setDepreciationRate] = useState(String(vehicle.depreciation_rate ?? 10));
  const [ipva, setIpva] = useState(vehicle.ipva_annual);
  const [insurance, setInsurance] = useState(vehicle.insurance_annual);
  const [licensing, setLicensing] = useState(vehicle.licensing_annual);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const preview = fixedCosts({
    purchasePrice,
    depreciationRate: Number(depreciationRate) || 0,
    ipvaAnnual: ipva,
    insuranceAnnual: insurance,
    licensingAnnual: licensing,
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("vehicles")
      .update({
        plate: plate.trim().toUpperCase() || null,
        odometer: Number(odometer) || 0,
        purchase_price: purchasePrice > 0 ? purchasePrice : null,
        depreciation_rate: Math.min(100, Math.max(0, Number(depreciationRate) || 0)),
        ipva_annual: ipva,
        insurance_annual: insurance,
        licensing_annual: licensing,
      })
      .eq("id", vehicle.id);

    if (updateError) {
      setError(
        updateError.code === "42703" || updateError.code === "PGRST204"
          ? "A atualização do banco para custos de propriedade ainda não foi aplicada."
          : "Não foi possível salvar. Tente novamente.",
      );
      setSaving(false);
      return;
    }

    setSaving(false);
    await onSaved();
    onClose();
  }

  return (
    <>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--color-accent)_16%,transparent)] text-accent">
                  <Coins className="size-5" />
                </span>
                <div>
                  <h2 id="vehicle-costs-title" className="font-semibold text-ink">Custos de propriedade</h2>
                  <p className="text-xs text-ink-muted">{vehicle.brand} {vehicle.model} · {vehicle.year}</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-xl text-ink-muted transition-colors hover:text-ink" aria-label="Fechar">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="field-label">Placa
                <input className="field uppercase" value={plate} onChange={(event) => setPlate(event.target.value.toUpperCase())} maxLength={8} placeholder="ABC1D23" />
              </label>
              <label className="field-label">Odômetro atual (km)
                <input className="field tnum" type="number" inputMode="numeric" min={0} value={odometer} onChange={(event) => setOdometer(event.target.value.replace(/\D/g, ""))} />
              </label>
              <label className="field-label">Valor de compra
                <MoneyInput value={purchasePrice} onValueChange={setPurchasePrice} placeholder="0,00" />
                <span className="field-help">Base do cálculo de depreciação.</span>
              </label>
              <label className="field-label">Depreciação (% ao ano)
                <input className="field tnum" type="number" inputMode="decimal" min={0} max={100} step="0.5" value={depreciationRate} onChange={(event) => setDepreciationRate(event.target.value)} />
                <span className="field-help">Usual no Brasil: 8% a 12% ao ano.</span>
              </label>
              <label className="field-label">IPVA (anual)
                <MoneyInput value={ipva} onValueChange={setIpva} placeholder="0,00" />
              </label>
              <label className="field-label">Seguro (anual)
                <MoneyInput value={insurance} onValueChange={setInsurance} placeholder="0,00" />
              </label>
              <label className="field-label sm:col-span-2">Licenciamento (anual)
                <MoneyInput value={licensing} onValueChange={setLicensing} placeholder="0,00" />
              </label>

              <div className="rounded-2xl bg-[color-mix(in_oklab,var(--color-accent)_8%,transparent)] p-4 sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Custo fixo estimado</p>
                <p className="tnum mt-1 text-2xl font-semibold text-ink">{formatBRL(preview.totalMonthly)}<span className="text-sm font-normal text-ink-muted"> /mês</span></p>
                <p className="mt-1 text-xs text-ink-muted">
                  {formatBRL(preview.totalAnnual)} por ano · depreciação {formatBRL(preview.depreciation)}
                </p>
              </div>

              {error && <p role="alert" className="rounded-2xl bg-rose-400/10 p-3 text-sm text-neg sm:col-span-2">{error}</p>}

              <div className="flex gap-3 sm:col-span-2">
                <button type="button" onClick={onClose} className="flex-1 rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-ink-soft transition-all hover:text-ink active:scale-95">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center active:scale-95">
                  {saving ? <><LoaderCircle className="size-4 animate-spin" />Salvando...</> : <><Check className="size-4" />Salvar</>}
                </button>
              </div>
            </form>
    </>
  );
}

export function VehicleCostsDialog({ vehicle, onClose, onSaved }: {
  vehicle: GarageVehicle | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {vehicle && (
        <motion.div
          className="fixed inset-0 z-[var(--z-modal,120)] grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.18 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="vehicle-costs-title"
            className="ios-glass my-auto w-full max-w-lg rounded-[1.5rem] p-6 shadow-2xl"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <CostsForm key={vehicle.id} vehicle={vehicle} onClose={onClose} onSaved={onSaved} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
