"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, LoaderCircle, Wrench, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MAINTENANCE_INTERVALS } from "@/lib/vehicleCosts";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { SelectField } from "@/components/forms/SelectField";
import type { GarageVehicle } from "@/lib/supabase/useGarage";

/** Soma meses a uma data ISO (YYYY-MM-DD). */
function addMonths(iso: string, months: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1 + months, day);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Formulário interno: nasce com o odômetro atual do veículo. Remontado por
 * `key` quando o veículo muda — sem efeito de sincronização de estado.
 */
function MaintenanceForm({ vehicle, onClose, onSaved }: {
  vehicle: GarageVehicle;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [kind, setKind] = useState("oil");
  const [occurredOn, setOccurredOn] = useState(today);
  const [odometer, setOdometer] = useState(String(Math.round(vehicle.odometer) || ""));
  const [cost, setCost] = useState(0);
  const [description, setDescription] = useState("");
  const [scheduleNext, setScheduleNext] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const interval = MAINTENANCE_INTERVALS[kind] ?? MAINTENANCE_INTERVALS.other;
  // Sugestão de próxima manutenção a partir do intervalo típico do item.
  const suggestion = useMemo(() => {
    const base = Number(odometer) || 0;
    return {
      km: interval.km > 0 ? base + interval.km : null,
      date: interval.months > 0 ? addMonths(occurredOn, interval.months) : null,
    };
  }, [interval, odometer, occurredOn]);

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
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError("Sua sessão expirou. Entre novamente.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("vehicle_maintenances").insert({
      user_id: userData.user.id,
      vehicle_id: vehicle.id,
      kind,
      description: description.trim() || null,
      occurred_on: occurredOn,
      odometer: Number(odometer) || null,
      cost,
      next_due_km: scheduleNext ? suggestion.km : null,
      next_due_date: scheduleNext ? suggestion.date : null,
    });

    if (insertError) {
      setError(
        insertError.code === "42P01" || insertError.code === "PGRST205"
          ? "A atualização do banco para manutenções ainda não foi aplicada."
          : "Não foi possível registrar a manutenção. Tente novamente.",
      );
      setSaving(false);
      return;
    }

    // Mantém o odômetro do veículo em dia se o informado for maior.
    const informed = Number(odometer) || 0;
    if (informed > vehicle.odometer) {
      await supabase.from("vehicles").update({ odometer: informed }).eq("id", vehicle.id);
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
                  <Wrench className="size-5" />
                </span>
                <div>
                  <h2 id="maintenance-title" className="font-semibold text-ink">Registrar manutenção</h2>
                  <p className="text-xs text-ink-muted">{vehicle.brand} {vehicle.model} · {vehicle.year}</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-xl text-ink-muted transition-colors hover:text-ink" aria-label="Fechar">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="field-label">Item
                <SelectField value={kind} onChange={(event) => setKind(event.target.value)}>
                  {Object.entries(MAINTENANCE_INTERVALS).map(([value, item]) => (
                    <option key={value} value={value}>{item.label}</option>
                  ))}
                </SelectField>
              </label>
              <label className="field-label">Data
                <input className="field" type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} required />
              </label>
              <label className="field-label">Odômetro (km)
                <input
                  className="field tnum"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={odometer}
                  onChange={(event) => setOdometer(event.target.value.replace(/\D/g, ""))}
                  placeholder="Ex.: 45000"
                />
              </label>
              <label className="field-label">Custo
                <MoneyInput value={cost} onValueChange={setCost} placeholder="0,00" />
              </label>
              <label className="field-label sm:col-span-2">Observação
                <input className="field" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={300} placeholder="Oficina, peça trocada..." />
              </label>

              {interval.km > 0 && (
                <label className="ios-glass flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 sm:col-span-2">
                  <input type="checkbox" checked={scheduleNext} onChange={(event) => setScheduleNext(event.target.checked)} className="mt-0.5 size-4" />
                  <span className="text-sm">
                    <strong className="block font-semibold text-ink">Agendar a próxima</strong>
                    <span className="text-xs text-ink-muted">
                      Avisa em {suggestion.km?.toLocaleString("pt-BR")} km
                      {suggestion.date ? ` ou em ${new Date(`${suggestion.date}T12:00:00`).toLocaleDateString("pt-BR")}` : ""} — o que vier primeiro.
                    </span>
                  </span>
                </label>
              )}

              {error && <p role="alert" className="rounded-2xl bg-rose-400/10 p-3 text-sm text-neg sm:col-span-2">{error}</p>}

              <div className="flex gap-3 sm:col-span-2">
                <button type="button" onClick={onClose} className="flex-1 rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-ink-soft transition-all hover:text-ink active:scale-95">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center active:scale-95">
                  {saving ? <><LoaderCircle className="size-4 animate-spin" />Salvando...</> : <><Check className="size-4" />Registrar</>}
                </button>
              </div>
            </form>
    </>
  );
}

export function MaintenanceDialog({ vehicle, onClose, onSaved }: {
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
            aria-labelledby="maintenance-title"
            className="ios-glass my-auto w-full max-w-lg rounded-[1.5rem] p-6 shadow-2xl"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <MaintenanceForm key={vehicle.id} vehicle={vehicle} onClose={onClose} onSaved={onSaved} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
