"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { summarizeTrack, type TrackPoint, type TrackSummary } from "./distance";

/**
 * Rastreio de trajeto por GPS, em primeiro plano.
 *
 * LIMITAÇÃO IMPORTANTE: navegadores suspendem o JavaScript quando a tela é
 * bloqueada ou o app vai para segundo plano — no iOS isso é garantido. Não
 * existe rastreio em background num PWA (nem via TWA, que é um webview).
 * Por isso pedimos o Wake Lock para manter a tela acesa durante o trajeto e
 * avisamos o usuário quando o rastreio é interrompido.
 *
 * PRIVACIDADE: os pontos ficam apenas em memória, no aparelho. Nada de rota é
 * enviado ou persistido — só o resultado agregado (km, duração, velocidade).
 */

export type TrackerState = "idle" | "requesting" | "tracking" | "paused" | "finished";

interface WakeLockSentinelLike {
  release: () => Promise<void>;
  addEventListener: (type: string, listener: () => void) => void;
}

export function useTripTracker() {
  const [state, setState] = useState<TrackerState>("idle");
  const [summary, setSummary] = useState<TrackSummary>({
    km: 0,
    durationSeconds: 0,
    averageSpeedKmh: 0,
    usedPoints: 0,
  });
  const [error, setError] = useState("");
  const [interrupted, setInterrupted] = useState(false);
  const [supported, setSupported] = useState(true);

  // Pontos vivem só em memória — nunca são persistidos.
  const pointsRef = useRef<TrackPoint[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setSupported(typeof navigator !== "undefined" && "geolocation" in navigator);
    });
  }, []);

  const recalc = useCallback(() => {
    setSummary(summarizeTrack(pointsRef.current));
  }, []);

  const releaseWakeLock = useCallback(() => {
    void wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    releaseWakeLock();
  }, [releaseWakeLock]);

  /** Mantém a tela acesa — sem isso o navegador congela o rastreio. */
  const requestWakeLock = useCallback(async () => {
    try {
      const anyNavigator = navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
      };
      if (!anyNavigator.wakeLock) return;
      wakeLockRef.current = await anyNavigator.wakeLock.request("screen");
    } catch {
      /* Wake Lock é um reforço; sem ele o rastreio ainda funciona com a tela acesa. */
    }
  }, []);

  const start = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setError("Este aparelho não permite acesso à localização.");
      return false;
    }
    setError("");
    setInterrupted(false);
    setState("requesting");
    pointsRef.current = [];
    setSummary({ km: 0, durationSeconds: 0, averageSpeedKmh: 0, usedPoints: 0 });

    await requestWakeLock();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        pointsRef.current.push({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? 999,
          timestamp: position.timestamp,
        });
        setState((current) => (current === "requesting" ? "tracking" : current));
        recalc();
      },
      (positionError) => {
        stopWatch();
        setState("idle");
        setError(
          positionError.code === positionError.PERMISSION_DENIED
            ? "Permissão de localização negada. Libere o acesso para rastrear o trajeto."
            : "Não foi possível obter a localização. Verifique o GPS e tente novamente.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
    );

    // Mantém a duração viva na tela mesmo sem novos pontos.
    tickRef.current = window.setInterval(recalc, 1_000);
    return true;
  }, [recalc, requestWakeLock, stopWatch]);

  const finish = useCallback(() => {
    stopWatch();
    recalc();
    setState("finished");
  }, [recalc, stopWatch]);

  const reset = useCallback(() => {
    stopWatch();
    pointsRef.current = [];
    setSummary({ km: 0, durationSeconds: 0, averageSpeedKmh: 0, usedPoints: 0 });
    setInterrupted(false);
    setError("");
    setState("idle");
  }, [stopWatch]);

  // Se a aba perder o foco durante o rastreio, o navegador congela a coleta.
  // Detectamos e avisamos, em vez de deixar o usuário achar que gravou tudo.
  useEffect(() => {
    if (state !== "tracking") return;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        setInterrupted(true);
      } else {
        // Ao voltar, o Wake Lock precisa ser pedido de novo.
        void requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [state, requestWakeLock]);

  // Garante que o watch e o wake lock não vazem ao desmontar.
  useEffect(() => () => stopWatch(), [stopWatch]);

  return { state, summary, error, interrupted, supported, start, finish, reset } as const;
}
