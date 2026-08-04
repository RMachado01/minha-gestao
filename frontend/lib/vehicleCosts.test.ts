import { describe, expect, it } from "vitest";
import {
  annualDepreciation,
  costPerKm,
  fixedCosts,
  maintenanceStatus,
  realEfficiency,
} from "./vehicleCosts";

describe("annualDepreciation", () => {
  it("aplica a taxa sobre o valor de compra", () => {
    expect(annualDepreciation({ purchasePrice: 80_000, depreciationRate: 10 })).toBe(8_000);
  });

  it("é zero sem valor de compra ou sem taxa", () => {
    expect(annualDepreciation({ purchasePrice: null, depreciationRate: 10 })).toBe(0);
    expect(annualDepreciation({ purchasePrice: 80_000, depreciationRate: 0 })).toBe(0);
  });

  it("limita a taxa a 100%", () => {
    expect(annualDepreciation({ purchasePrice: 50_000, depreciationRate: 150 })).toBe(50_000);
  });
});

describe("fixedCosts", () => {
  it("soma IPVA, seguro, licenciamento e depreciação", () => {
    const result = fixedCosts({
      purchasePrice: 60_000,
      depreciationRate: 10,
      ipvaAnnual: 2_400,
      insuranceAnnual: 3_000,
      licensingAnnual: 200,
    });
    expect(result.depreciation).toBe(6_000);
    expect(result.totalAnnual).toBe(11_600);
    expect(result.totalMonthly).toBeCloseTo(966.67, 2);
  });

  it("ignora valores ausentes ou negativos", () => {
    const result = fixedCosts({ ipvaAnnual: -100, insuranceAnnual: null });
    expect(result.totalAnnual).toBe(0);
    expect(result.totalMonthly).toBe(0);
  });
});

describe("costPerKm", () => {
  it("separa custo variável e fixo por km", () => {
    // R$ 600 de combustível + R$ 900 de fixos, em 1.000 km no mês.
    const result = costPerKm(600, 900, 1_000);
    expect(result.variablePerKm).toBeCloseTo(0.6, 4);
    expect(result.fixedPerKm).toBeCloseTo(0.9, 4);
    expect(result.totalPerKm).toBeCloseTo(1.5, 4);
    expect(result.fixedShare).toBeCloseTo(0.6, 4);
  });

  it("devolve zeros sem quilometragem, em vez de dividir por zero", () => {
    const result = costPerKm(500, 900, 0);
    expect(result.totalPerKm).toBe(0);
    expect(Number.isFinite(result.totalPerKm)).toBe(true);
    expect(result.fixedShare).toBe(0);
  });
});

describe("realEfficiency", () => {
  it("calcula km por litro a partir do consumo real", () => {
    expect(realEfficiency(420, 30)).toBe(14);
  });

  it("é zero com entradas inválidas", () => {
    expect(realEfficiency(0, 30)).toBe(0);
    expect(realEfficiency(420, 0)).toBe(0);
  });
});

describe("maintenanceStatus", () => {
  const today = new Date(2026, 7, 4); // 4 de agosto de 2026

  it("fica ok quando ainda falta bastante", () => {
    const status = maintenanceStatus(60_000, 50_000, null, today);
    expect(status.urgency).toBe("ok");
    expect(status.kmRemaining).toBe(10_000);
  });

  it("avisa quando está perto pelo odômetro", () => {
    expect(maintenanceStatus(50_300, 50_000, null, today).urgency).toBe("soon");
  });

  it("marca atrasado quando passou do km", () => {
    const status = maintenanceStatus(49_000, 50_000, null, today);
    expect(status.urgency).toBe("overdue");
    expect(status.kmRemaining).toBe(-1_000);
  });

  it("considera também a data prevista", () => {
    expect(maintenanceStatus(null, 0, "2026-08-10", today).urgency).toBe("soon");
    expect(maintenanceStatus(null, 0, "2026-07-30", today).urgency).toBe("overdue");
    expect(maintenanceStatus(null, 0, "2026-12-01", today).urgency).toBe("ok");
  });

  it("usa o vencimento mais urgente entre km e data", () => {
    // Km tranquilo, mas a data já passou.
    const status = maintenanceStatus(90_000, 50_000, "2026-07-01", today);
    expect(status.urgency).toBe("overdue");
  });

  it("é ok quando não há previsão definida", () => {
    const status = maintenanceStatus(null, 50_000, null, today);
    expect(status.urgency).toBe("ok");
    expect(status.kmRemaining).toBeNull();
    expect(status.daysRemaining).toBeNull();
  });
});
