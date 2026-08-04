import { describe, expect, it } from "vitest";
import {
  displacementToAdd,
  formatDuration,
  haversineMeters,
  summarizeTrack,
  type TrackPoint,
} from "./distance";

function point(latitude: number, longitude: number, accuracy = 10, timestamp = 0): TrackPoint {
  return { latitude, longitude, accuracy, timestamp };
}

describe("haversineMeters", () => {
  it("mede zero entre o mesmo ponto", () => {
    expect(haversineMeters(point(-23.55, -46.63), point(-23.55, -46.63))).toBe(0);
  });

  it("aproxima distâncias conhecidas", () => {
    // ~0,001° de latitude ≈ 111 m.
    const meters = haversineMeters(point(-23.55, -46.63), point(-23.551, -46.63));
    expect(meters).toBeGreaterThan(100);
    expect(meters).toBeLessThan(120);
  });
});

describe("displacementToAdd", () => {
  const origin = point(-23.55, -46.63, 10, 0);

  it("aceita deslocamento real com boa precisão", () => {
    const next = point(-23.551, -46.63, 10, 10_000);
    expect(displacementToAdd(origin, next)).toBeGreaterThan(100);
  });

  it("descarta leitura imprecisa", () => {
    const impreciso = point(-23.551, -46.63, 120, 10_000);
    expect(displacementToAdd(origin, impreciso)).toBe(0);
  });

  it("ignora oscilação do GPS parado (menor que o deslocamento mínimo)", () => {
    // ~0,00002° ≈ 2 m: jitter típico com o carro parado no semáforo.
    const jitter = point(-23.55002, -46.63, 10, 5_000);
    expect(displacementToAdd(origin, jitter)).toBe(0);
  });

  it("descarta salto impossível (perda e retomada de sinal)", () => {
    // ~11 km em 1 segundo = velocidade absurda.
    const salto = point(-23.65, -46.63, 10, 1_000);
    expect(displacementToAdd(origin, salto)).toBe(0);
  });
});

describe("summarizeTrack", () => {
  it("é zero com menos de dois pontos", () => {
    expect(summarizeTrack([]).km).toBe(0);
    expect(summarizeTrack([point(-23.55, -46.63)]).km).toBe(0);
  });

  it("soma um percurso em linha e calcula a velocidade média", () => {
    // 5 trechos de ~111 m, um por minuto → ~0,555 km em 5 min.
    const points = Array.from({ length: 6 }, (_, index) =>
      point(-23.55 - index * 0.001, -46.63, 10, index * 60_000),
    );
    const summary = summarizeTrack(points);
    expect(summary.km).toBeGreaterThan(0.5);
    expect(summary.km).toBeLessThan(0.6);
    expect(summary.durationSeconds).toBe(300);
    expect(summary.averageSpeedKmh).toBeGreaterThan(5);
    expect(summary.usedPoints).toBe(6);
  });

  it("não infla a distância com ruído de aparelho parado", () => {
    // 30 leituras oscilando poucos metros em torno do mesmo ponto.
    const noisy = Array.from({ length: 30 }, (_, index) =>
      point(-23.55 + (index % 2 === 0 ? 0.00002 : -0.00002), -46.63, 10, index * 2_000),
    );
    const summary = summarizeTrack(noisy);
    expect(summary.km).toBe(0);
  });

  it("mantém a duração mesmo quando o percurso é descartado como ruído", () => {
    const noisy = [
      point(-23.55, -46.63, 10, 0),
      point(-23.55001, -46.63, 10, 60_000),
    ];
    expect(summarizeTrack(noisy).durationSeconds).toBe(60);
  });
});

describe("formatDuration", () => {
  it("formata horas e minutos", () => {
    expect(formatDuration(4_980)).toBe("1h 23min");
  });

  it("formata apenas minutos", () => {
    expect(formatDuration(2_700)).toBe("45min");
  });

  it("formata segundos em trajetos muito curtos", () => {
    expect(formatDuration(42)).toBe("42s");
  });
});
