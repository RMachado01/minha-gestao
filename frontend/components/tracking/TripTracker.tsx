"use client";

import { AlertTriangle, Check, Navigation, Square, TriangleAlert } from "lucide-react";
import { useTripTracker } from "@/lib/tracking/useTripTracker";
import { formatDuration } from "@/lib/tracking/distance";

/**
 * Rastreio de trajeto por GPS. Ao encerrar, entrega a quilometragem medida
 * para o formulário que o contém (garagem ou diário de corridas).
 *
 * Só funciona em primeiro plano: o navegador congela o rastreio com a tela
 * bloqueada. A interface deixa isso explícito e avisa se for interrompido.
 */
export function TripTracker({ onApply }: { onApply: (km: number) => void }) {
  const { state, summary, error, interrupted, supported, start, finish, reset } = useTripTracker();

  if (!supported) return null;

  const running = state === "tracking" || state === "requesting";

  return (
    <div className="ios-glass rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--color-accent)_16%,transparent)] text-accent">
            <Navigation className={`size-4 ${running ? "animate-pulse" : ""}`} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Rastrear por GPS</p>
            <p className="text-xs text-ink-muted">Mede a distância automaticamente</p>
          </div>
        </div>
        {running && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-neg">
            <span className="size-1.5 animate-pulse rounded-full bg-neg" />
            {state === "requesting" ? "Buscando sinal" : "Gravando"}
          </span>
        )}
      </div>

      {/* Leitura ao vivo */}
      {(running || state === "finished") && (
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl bg-black/[.045] p-3">
            <p className="text-[11px] text-ink-muted">Distância</p>
            <p className="tnum mt-1 text-lg font-semibold text-ink">
              {summary.km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km
            </p>
          </div>
          <div className="rounded-2xl bg-black/[.045] p-3">
            <p className="text-[11px] text-ink-muted">Duração</p>
            <p className="tnum mt-1 text-lg font-semibold text-ink">{formatDuration(summary.durationSeconds)}</p>
          </div>
          <div className="rounded-2xl bg-black/[.045] p-3">
            <p className="text-[11px] text-ink-muted">Média</p>
            <p className="tnum mt-1 text-lg font-semibold text-ink">
              {summary.averageSpeedKmh.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} km/h
            </p>
          </div>
        </div>
      )}

      {/* Aviso de interrupção — o rastreio realmente para em segundo plano */}
      {interrupted && running && (
        <p role="status" className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-400/10 p-3 text-xs text-warn">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          O app saiu da tela e a gravação pausou nesse período — a distância pode ter ficado menor que a real. Mantenha a tela ligada e o app aberto.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-2xl bg-rose-400/10 p-3 text-xs text-neg">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      )}

      {/* Ações */}
      <div className="mt-4 flex gap-3">
        {state === "idle" && (
          <button type="button" onClick={() => void start()} className="btn-primary flex-1 justify-center active:scale-95">
            <Navigation className="size-4" />
            Iniciar trajeto
          </button>
        )}

        {running && (
          <button
            type="button"
            onClick={finish}
            className="flex-1 justify-center rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-rose-600 active:scale-95"
          >
            <Square className="mr-1.5 inline size-4" />
            Encerrar
          </button>
        )}

        {state === "finished" && (
          <>
            <button
              type="button"
              onClick={reset}
              className="flex-1 rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm font-semibold text-ink-soft transition-all hover:text-ink active:scale-95"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={() => { onApply(Number(summary.km.toFixed(1))); reset(); }}
              disabled={summary.km <= 0}
              className="btn-primary flex-1 justify-center active:scale-95 disabled:opacity-50"
            >
              <Check className="size-4" />
              Usar {summary.km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km
            </button>
          </>
        )}
      </div>

      {state === "idle" && (
        <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
          Mantenha o app aberto com a tela ligada durante o trajeto — navegadores
          param o GPS em segundo plano. Só a distância, a duração e a média são
          salvas; o percurso não é gravado nem enviado.
        </p>
      )}
    </div>
  );
}
