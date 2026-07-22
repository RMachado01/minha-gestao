import { describe, expect, it } from "vitest";
import { importKey, parseAmount, parseDate, parseStatement } from "./statement";

describe("parseAmount", () => {
  it("lê o formato brasileiro e internacional", () => {
    expect(parseAmount("1.234,56")).toBe(1234.56);
    expect(parseAmount("R$ -1.234,56")).toBe(-1234.56);
    expect(parseAmount("1234.56")).toBe(1234.56);
    expect(parseAmount("-89,90")).toBe(-89.9);
    expect(parseAmount("")).toBeNull();
  });
});

describe("parseDate", () => {
  it("normaliza para YYYY-MM-DD", () => {
    expect(parseDate("15/01/2026")).toBe("2026-01-15");
    expect(parseDate("2026-01-15")).toBe("2026-01-15");
    expect(parseDate("20260115120000[-3:BRT]")).toBe("2026-01-15");
    expect(parseDate("bla")).toBeNull();
  });
});

describe("parseStatement — OFX", () => {
  const ofx = `
<OFX><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260115<TRNAMT>-89.90<FITID>ABC1<NAME>Spotify</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260110<TRNAMT>3500.00<FITID>ABC2<NAME>Salario</STMTTRN>
</BANKTRANLIST></OFX>`;

  it("extrai transações com sinal e FITID", () => {
    const { items, format } = parseStatement("extrato.ofx", ofx);
    expect(format).toBe("ofx");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ date: "2026-01-15", description: "Spotify", amount: 89.9, type: "expense", externalId: "ABC1" });
    expect(items[1]).toMatchObject({ amount: 3500, type: "income" });
  });

  it("gera chave idempotente a partir do FITID", () => {
    const { items } = parseStatement("extrato.ofx", ofx);
    expect(importKey(items[0])).toBe("import:ABC1");
  });
});

describe("parseStatement — CSV", () => {
  it("detecta colunas e delimitador ;", () => {
    const csv = "Data;Valor;Descrição\n15/01/2026;-89,90;Netflix\n10/01/2026;3.500,00;Salário";
    const { items, format } = parseStatement("nubank.csv", csv);
    expect(format).toBe("csv");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ date: "2026-01-15", type: "expense", amount: 89.9 });
    expect(items[1]).toMatchObject({ type: "income", amount: 3500 });
  });

  it("avisa quando não encontra colunas essenciais", () => {
    const { items, warnings } = parseStatement("ruim.csv", "foo,bar\n1,2");
    expect(items).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
  });
});
