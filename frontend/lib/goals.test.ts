import { describe, expect, it } from "vitest";
import { formatDuration, futureValue, monthsToTarget } from "./goals";

describe("projeções de metas", () => {
  it("projeta aportes sem juros", () => {
    expect(futureValue(1_000, 500, 0, 12)).toBe(7_000);
  });

  it("encontra o prazo e trata metas inviáveis", () => {
    expect(monthsToTarget(0, 1_200, 100, 0)).toBe(12);
    expect(monthsToTarget(0, 1_200, 0, 0)).toBeNull();
    expect(monthsToTarget(1_200, 1_200, 0, 0)).toBe(0);
  });

  it("formata o prazo de forma legível", () => {
    expect(formatDuration(0)).toBe("Meta alcançada");
    expect(formatDuration(13)).toBe("1 ano e 1 mês");
    expect(formatDuration(null)).toBe("Mais de 50 anos");
  });
});
