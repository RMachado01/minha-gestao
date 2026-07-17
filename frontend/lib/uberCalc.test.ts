import { describe, expect, it } from "vitest";
import { calcEnergyConsumed, calcEnergyCost } from "./uberCalc";

describe("cálculo de energia e combustível", () => {
  it("calcula kWh de um veículo elétrico por 100 km", () => {
    expect(calcEnergyConsumed(150, 18, "electric")).toBeCloseTo(27);
  });

  it("calcula litros de veículos híbridos e a combustão", () => {
    expect(calcEnergyConsumed(120, 12, "hybrid")).toBeCloseTo(10);
    expect(calcEnergyConsumed(120, 0, "combustion")).toBe(0);
  });

  it("calcula o custo pelo consumo", () => {
    expect(calcEnergyCost(27, 0.95)).toBeCloseTo(25.65);
  });
});
