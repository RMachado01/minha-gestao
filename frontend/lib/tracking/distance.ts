/**
 * Cálculo de distância a partir de pontos de GPS.
 *
 * O ponto crítico aqui é o RUÍDO. Somar a distância entre todos os pontos
 * crus do GPS superestima bastante o percurso: parado num semáforo, o aparelho
 * continua reportando posições que oscilam alguns metros, e cada oscilação
 * vira "distância percorrida". Uma viagem de 10 km facilmente marca 12.
 *
 * Por isso filtramos em três camadas:
 *   1. precisão — descarta leituras com raio de erro grande;
 *   2. deslocamento mínimo — ignora movimentos menores que o próprio erro;
 *   3. velocidade plausível — descarta saltos impossíveis (perda de sinal).
 *
 * Funções puras, sem acesso ao navegador, para poderem ser testadas.
 */

export interface TrackPoint {
  latitude: number;
  longitude: number;
  /** Raio de erro estimado, em metros. */
  accuracy: number;
  /** Timestamp em milissegundos. */
  timestamp: number;
}

export interface TrackingOptions {
  /** Descarta pontos com precisão pior que isto (metros). */
  maxAccuracy?: number;
  /** Deslocamento mínimo para contar como movimento (metros). */
  minDisplacement?: number;
  /** Velocidade máxima plausível (km/h) — acima disso é salto de sinal. */
  maxSpeedKmh?: number;
}

const DEFAULTS: Required<TrackingOptions> = {
  maxAccuracy: 50,
  minDisplacement: 10,
  maxSpeedKmh: 200,
};

const EARTH_RADIUS_M = 6_371_000;

/** Distância em metros entre dois pontos (fórmula de Haversine). */
export function haversineMeters(a: TrackPoint, b: TrackPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Decide se um novo ponto deve ser somado ao percurso.
 * Devolve a distância a acrescentar (metros) — 0 significa "ignorar".
 */
export function displacementToAdd(
  previous: TrackPoint,
  next: TrackPoint,
  options: TrackingOptions = {},
): number {
  const { maxAccuracy, minDisplacement, maxSpeedKmh } = { ...DEFAULTS, ...options };

  // 1. Leitura imprecisa demais para ser confiável.
  if (next.accuracy > maxAccuracy) return 0;

  const meters = haversineMeters(previous, next);

  // 2. Movimento dentro da margem de erro — provavelmente o aparelho parado.
  if (meters < minDisplacement) return 0;

  // 3. Salto impossível (túnel, perda e retomada de sinal).
  const seconds = (next.timestamp - previous.timestamp) / 1000;
  if (seconds > 0) {
    const speedKmh = (meters / seconds) * 3.6;
    if (speedKmh > maxSpeedKmh) return 0;
  }

  return meters;
}

export interface TrackSummary {
  /** Distância total em quilômetros. */
  km: number;
  /** Duração em segundos (do primeiro ao último ponto). */
  durationSeconds: number;
  /** Velocidade média em km/h no período. */
  averageSpeedKmh: number;
  /** Quantos pontos foram efetivamente usados. */
  usedPoints: number;
}

/** Consolida uma sequência de pontos em distância, duração e velocidade média. */
export function summarizeTrack(points: TrackPoint[], options: TrackingOptions = {}): TrackSummary {
  if (points.length < 2) {
    return { km: 0, durationSeconds: 0, averageSpeedKmh: 0, usedPoints: points.length };
  }

  let meters = 0;
  let used = 1;
  let reference = points[0];

  for (let index = 1; index < points.length; index += 1) {
    const candidate = points[index];
    const add = displacementToAdd(reference, candidate, options);
    if (add > 0) {
      meters += add;
      reference = candidate;
      used += 1;
    }
  }

  const durationSeconds = Math.max(0, (points[points.length - 1].timestamp - points[0].timestamp) / 1000);
  const km = meters / 1000;
  const averageSpeedKmh = durationSeconds > 0 ? (km / durationSeconds) * 3600 : 0;

  return { km, durationSeconds, averageSpeedKmh, usedPoints: used };
}

/** Formata uma duração em segundos como "1h 23min" ou "45min". */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}min`;
  if (minutes > 0) return `${minutes}min`;
  return `${total}s`;
}
