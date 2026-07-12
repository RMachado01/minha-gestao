import type { Modo } from "@/lib/usePeriodo";

/** Ponto genérico de série temporal já agregado (formato dos endpoints reais). */
export interface PontoSerie {
  periodo: string;
  [chave: string]: string | number;
}

export type { Modo };
