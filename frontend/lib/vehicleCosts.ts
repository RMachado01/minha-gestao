/**
 * Cálculos de custo de veículo (TCO — custo total de propriedade).
 *
 * O custo por km "de posto" (só combustível) engana: IPVA, seguro,
 * licenciamento e principalmente depreciação costumam responder por mais da
 * metade do que o carro realmente custa por quilômetro. Estas funções separam
 * custo fixo (existe mesmo parado) de custo variável (cresce com o uso) e
 * juntam os dois no custo real por km.
 *
 * Todas as funções são puras — sem I/O — para ficarem testáveis.
 */

export interface VehicleCostInputs {
  /** Valor pago no veículo (base da depreciação). */
  purchasePrice?: number | null;
  /** Depreciação anual em % sobre o valor de compra. */
  depreciationRate?: number | null;
  ipvaAnnual?: number | null;
  insuranceAnnual?: number | null;
  licensingAnnual?: number | null;
}

export interface FixedCostBreakdown {
  ipva: number;
  insurance: number;
  licensing: number;
  depreciation: number;
  /** Soma anual de todos os custos fixos. */
  totalAnnual: number;
  /** Equivalente mensal (anual ÷ 12). */
  totalMonthly: number;
}

function safe(value: number | null | undefined): number {
  return Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0;
}

/** Depreciação anual estimada = valor de compra × taxa (% a.a.). */
export function annualDepreciation(inputs: VehicleCostInputs): number {
  const price = safe(inputs.purchasePrice);
  const rate = safe(inputs.depreciationRate);
  if (price === 0 || rate === 0) return 0;
  return (price * Math.min(rate, 100)) / 100;
}

/** Custos que existem mesmo com o carro parado, anual e mensalmente. */
export function fixedCosts(inputs: VehicleCostInputs): FixedCostBreakdown {
  const ipva = safe(inputs.ipvaAnnual);
  const insurance = safe(inputs.insuranceAnnual);
  const licensing = safe(inputs.licensingAnnual);
  const depreciation = annualDepreciation(inputs);
  const totalAnnual = ipva + insurance + licensing + depreciation;
  return {
    ipva,
    insurance,
    licensing,
    depreciation,
    totalAnnual,
    totalMonthly: totalAnnual / 12,
  };
}

export interface CostPerKmResult {
  /** Só o que varia com o uso (combustível, pedágio, manutenção). */
  variablePerKm: number;
  /** Fixos rateados pela quilometragem do período. */
  fixedPerKm: number;
  /** Custo real por km — a soma dos dois. */
  totalPerKm: number;
  /** Quanto dos fixos representa do total (0–1). */
  fixedShare: number;
}

/**
 * Custo real por km no período: custo variável do período + rateio dos fixos.
 * Sem quilometragem, o custo por km é indefinido — devolvemos zeros em vez de
 * Infinity para a interface não exibir números sem sentido.
 */
export function costPerKm(
  variableCostPeriod: number,
  fixedCostPeriod: number,
  kmPeriod: number,
): CostPerKmResult {
  if (!(kmPeriod > 0)) {
    return { variablePerKm: 0, fixedPerKm: 0, totalPerKm: 0, fixedShare: 0 };
  }
  const variablePerKm = Math.max(0, variableCostPeriod) / kmPeriod;
  const fixedPerKm = Math.max(0, fixedCostPeriod) / kmPeriod;
  const totalPerKm = variablePerKm + fixedPerKm;
  return {
    variablePerKm,
    fixedPerKm,
    totalPerKm,
    fixedShare: totalPerKm > 0 ? fixedPerKm / totalPerKm : 0,
  };
}

/** Consumo real medido: km rodados ÷ litros (ou kWh) consumidos. */
export function realEfficiency(km: number, unitsConsumed: number): number {
  if (!(km > 0) || !(unitsConsumed > 0)) return 0;
  return km / unitsConsumed;
}

export type MaintenanceUrgency = "ok" | "soon" | "overdue";

export interface MaintenanceStatus {
  urgency: MaintenanceUrgency;
  /** Km faltando (negativo = passou do ponto). Null se não há meta por km. */
  kmRemaining: number | null;
  /** Dias faltando (negativo = atrasado). Null se não há meta por data. */
  daysRemaining: number | null;
}

const SOON_KM_THRESHOLD = 500;
const SOON_DAYS_THRESHOLD = 15;

/**
 * Status de uma manutenção prevista, considerando km e/ou data — o que estiver
 * mais próximo manda (é o que vence primeiro na prática).
 */
export function maintenanceStatus(
  nextDueKm: number | null | undefined,
  currentOdometer: number | null | undefined,
  nextDueDate: string | null | undefined,
  today: Date = new Date(),
): MaintenanceStatus {
  let kmRemaining: number | null = null;
  if (nextDueKm != null && Number.isFinite(Number(nextDueKm))) {
    kmRemaining = Number(nextDueKm) - safe(currentOdometer);
  }

  let daysRemaining: number | null = null;
  if (nextDueDate) {
    const due = new Date(`${nextDueDate}T12:00:00`);
    if (!Number.isNaN(due.getTime())) {
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      daysRemaining = Math.round((due.getTime() - start.getTime()) / 86_400_000);
    }
  }

  const byKm: MaintenanceUrgency =
    kmRemaining == null ? "ok" : kmRemaining < 0 ? "overdue" : kmRemaining <= SOON_KM_THRESHOLD ? "soon" : "ok";
  const byDate: MaintenanceUrgency =
    daysRemaining == null ? "ok" : daysRemaining < 0 ? "overdue" : daysRemaining <= SOON_DAYS_THRESHOLD ? "soon" : "ok";

  const rank: Record<MaintenanceUrgency, number> = { ok: 0, soon: 1, overdue: 2 };
  const urgency = rank[byKm] >= rank[byDate] ? byKm : byDate;

  return { urgency, kmRemaining, daysRemaining };
}

/** Intervalos usuais de manutenção preventiva (km), usados como sugestão. */
export const MAINTENANCE_INTERVALS: Record<string, { label: string; km: number; months: number }> = {
  oil: { label: "Troca de óleo", km: 10_000, months: 12 },
  filter: { label: "Filtros", km: 10_000, months: 12 },
  tires: { label: "Pneus", km: 40_000, months: 36 },
  brakes: { label: "Freios", km: 30_000, months: 24 },
  revision: { label: "Revisão geral", km: 10_000, months: 12 },
  battery: { label: "Bateria", km: 60_000, months: 36 },
  alignment: { label: "Alinhamento", km: 10_000, months: 12 },
  other: { label: "Outro", km: 0, months: 0 },
};
