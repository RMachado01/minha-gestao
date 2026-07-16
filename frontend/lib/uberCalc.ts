export type Powertrain = "electric" | "hybrid" | "combustion";

/** Consumo de energia/combustível: elétrico em kWh (base 100 km), demais em litros. */
export function calcEnergyConsumed(distanceKm: number, efficiency: number, powertrain: Powertrain): number {
  if (powertrain === "electric") return (distanceKm * efficiency) / 100;
  return efficiency > 0 ? distanceKm / efficiency : 0;
}

/** Custo de energia/combustível a partir do consumo e da tarifa/preço unitário. */
export function calcEnergyCost(energyConsumed: number, unitPrice: number): number {
  return energyConsumed * unitPrice;
}
