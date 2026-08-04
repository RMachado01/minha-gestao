"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "./client";
import {
  costPerKm,
  fixedCosts,
  maintenanceStatus,
  type CostPerKmResult,
  type FixedCostBreakdown,
  type MaintenanceStatus,
} from "@/lib/vehicleCosts";

export interface GarageVehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  plate: string | null;
  powertrain: "combustion" | "hybrid" | "electric";
  odometer: number;
  purchase_price: number | null;
  purchase_date: string | null;
  ipva_annual: number;
  insurance_annual: number;
  licensing_annual: number;
  depreciation_rate: number;
  active: boolean;
}

export interface Maintenance {
  id: string;
  vehicle_id: string;
  kind: string;
  description: string | null;
  occurred_on: string;
  odometer: number | null;
  cost: number;
  next_due_km: number | null;
  next_due_date: string | null;
}

export interface UsageEntry {
  id: string;
  vehicle_id: string | null;
  occurred_on: string;
  kilometers: number;
  energy_or_fuel_cost: number;
  other_costs: number;
  consumed_units: number;
}

export interface VehicleAnalytics {
  vehicle: GarageVehicle;
  /** Custos fixos (IPVA, seguro, licenciamento, depreciação). */
  fixed: FixedCostBreakdown;
  /** Km rodados no mês corrente. */
  kmMonth: number;
  /** Combustível + extras + manutenções do mês. */
  variableMonth: number;
  /** Custo por km real (variável + rateio dos fixos). */
  perKm: CostPerKmResult;
  /** Custo total do mês (variável + fixo mensal). */
  totalMonth: number;
  /** Manutenção prevista mais urgente, se houver. */
  nextMaintenance: (Maintenance & { status: MaintenanceStatus }) | null;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const URGENCY_RANK = { ok: 0, soon: 1, overdue: 2 } as const;

export function useGarage() {
  const [vehicles, setVehicles] = useState<GarageVehicle[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [entries, setEntries] = useState<UsageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /** Sinaliza que a migration de TCO/manutenção ainda não foi aplicada. */
  const [needsMigration, setNeedsMigration] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setLoading(false);
      return;
    }

    const since = new Date();
    since.setMonth(since.getMonth() - 11);
    const sinceIso = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-01`;

    const [vehiclesResult, maintenancesResult, entriesResult] = await Promise.all([
      supabase
        .from("vehicles")
        .select("id,brand,model,year,plate,powertrain,odometer,purchase_price,purchase_date,ipva_annual,insurance_annual,licensing_annual,depreciation_rate,active")
        .eq("active", true)
        .order("year", { ascending: false }),
      supabase
        .from("vehicle_maintenances")
        .select("id,vehicle_id,kind,description,occurred_on,odometer,cost,next_due_km,next_due_date")
        .order("occurred_on", { ascending: false }),
      supabase
        .from("uber_daily_entries")
        .select("id,vehicle_id,occurred_on,kilometers,energy_or_fuel_cost,other_costs,consumed_units")
        .gte("occurred_on", sinceIso)
        .order("occurred_on", { ascending: false }),
    ]);

    // Colunas/tabela ausentes = migration pendente (o app segue utilizável).
    const missing =
      vehiclesResult.error?.code === "42703" ||
      vehiclesResult.error?.code === "PGRST204" ||
      maintenancesResult.error?.code === "42P01" ||
      maintenancesResult.error?.code === "PGRST205";
    if (missing) {
      setNeedsMigration(true);
    }

    if (vehiclesResult.error && !missing) {
      setError("Não foi possível carregar seus veículos.");
      setLoading(false);
      return;
    }

    setVehicles(
      ((vehiclesResult.data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        brand: String(row.brand ?? ""),
        model: String(row.model ?? ""),
        year: Number(row.year ?? 0),
        plate: (row.plate as string) ?? null,
        powertrain: (row.powertrain as GarageVehicle["powertrain"]) ?? "combustion",
        odometer: Number(row.odometer ?? 0),
        purchase_price: row.purchase_price == null ? null : Number(row.purchase_price),
        purchase_date: (row.purchase_date as string) ?? null,
        ipva_annual: Number(row.ipva_annual ?? 0),
        insurance_annual: Number(row.insurance_annual ?? 0),
        licensing_annual: Number(row.licensing_annual ?? 0),
        depreciation_rate: Number(row.depreciation_rate ?? 0),
        active: Boolean(row.active ?? true),
      })),
    );

    setMaintenances(
      ((maintenancesResult.data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        vehicle_id: String(row.vehicle_id),
        kind: String(row.kind),
        description: (row.description as string) ?? null,
        occurred_on: String(row.occurred_on),
        odometer: row.odometer == null ? null : Number(row.odometer),
        cost: Number(row.cost ?? 0),
        next_due_km: row.next_due_km == null ? null : Number(row.next_due_km),
        next_due_date: (row.next_due_date as string) ?? null,
      })),
    );

    setEntries(
      ((entriesResult.data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        vehicle_id: (row.vehicle_id as string) ?? null,
        occurred_on: String(row.occurred_on),
        kilometers: Number(row.kilometers ?? 0),
        energy_or_fuel_cost: Number(row.energy_or_fuel_cost ?? 0),
        other_costs: Number(row.other_costs ?? 0),
        consumed_units: Number(row.consumed_units ?? 0),
      })),
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  /** Métricas derivadas por veículo (mês corrente). */
  const analytics = useMemo<VehicleAnalytics[]>(() => {
    const currentMonth = monthKey(new Date());

    return vehicles.map((vehicle) => {
      const fixed = fixedCosts({
        purchasePrice: vehicle.purchase_price,
        depreciationRate: vehicle.depreciation_rate,
        ipvaAnnual: vehicle.ipva_annual,
        insuranceAnnual: vehicle.insurance_annual,
        licensingAnnual: vehicle.licensing_annual,
      });

      const monthEntries = entries.filter(
        (entry) => entry.vehicle_id === vehicle.id && entry.occurred_on.slice(0, 7) === currentMonth,
      );
      const kmMonth = monthEntries.reduce((sum, entry) => sum + entry.kilometers, 0);
      const usageCost = monthEntries.reduce(
        (sum, entry) => sum + entry.energy_or_fuel_cost + entry.other_costs,
        0,
      );
      const maintenanceCost = maintenances
        .filter((item) => item.vehicle_id === vehicle.id && item.occurred_on.slice(0, 7) === currentMonth)
        .reduce((sum, item) => sum + item.cost, 0);
      const variableMonth = usageCost + maintenanceCost;

      const perKm = costPerKm(variableMonth, fixed.totalMonthly, kmMonth);

      // Manutenção prevista mais urgente do veículo.
      const upcoming = maintenances
        .filter(
          (item) => item.vehicle_id === vehicle.id && (item.next_due_km != null || item.next_due_date != null),
        )
        .map((item) => ({
          ...item,
          status: maintenanceStatus(item.next_due_km, vehicle.odometer, item.next_due_date),
        }))
        .sort((a, b) => URGENCY_RANK[b.status.urgency] - URGENCY_RANK[a.status.urgency]);

      return {
        vehicle,
        fixed,
        kmMonth,
        variableMonth,
        perKm,
        totalMonth: variableMonth + fixed.totalMonthly,
        nextMaintenance: upcoming[0] ?? null,
      };
    });
  }, [vehicles, entries, maintenances]);

  /** Consolidado da frota no mês. */
  const fleet = useMemo(() => {
    const kmMonth = analytics.reduce((sum, item) => sum + item.kmMonth, 0);
    const variableMonth = analytics.reduce((sum, item) => sum + item.variableMonth, 0);
    const fixedMonth = analytics.reduce((sum, item) => sum + item.fixed.totalMonthly, 0);
    const alerts = analytics.filter(
      (item) => item.nextMaintenance && item.nextMaintenance.status.urgency !== "ok",
    );
    return {
      kmMonth,
      variableMonth,
      fixedMonth,
      totalMonth: variableMonth + fixedMonth,
      perKm: costPerKm(variableMonth, fixedMonth, kmMonth),
      alerts,
    };
  }, [analytics]);

  return { vehicles, maintenances, entries, analytics, fleet, loading, error, needsMigration, refresh } as const;
}
