import { describe, expect, it } from "vitest";
import { formatBRL, formatDateBR, formatPercent, variacao } from "./format";

describe("formatadores financeiros", () => {
  it("formata moeda e percentual em pt-BR", () => {
    expect(formatBRL(1234.56)).toMatch(/R\$\s*1\.234,56/);
    expect(formatPercent(0.125, true)).toBe("+12,5%");
  });

  it("formata datas ISO sem depender do fuso horário", () => {
    expect(formatDateBR("2026-07-17")).toBe("17/07/2026");
    expect(formatDateBR("2026-07-17", false)).toBe("17/07");
  });

  it("protege a variação contra divisão por zero", () => {
    expect(variacao(100, 0)).toBe(0);
    expect(variacao(120, 100)).toBeCloseTo(0.2);
  });
});
