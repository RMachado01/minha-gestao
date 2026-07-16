"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "./client";
import type { Vencimento } from "@/lib/mock/overview";

const RECURRENCE_META: Record<string, { categoria: string; tipo: Vencimento["tipo"] }> = {
  subscription: { categoria: "Assinatura", tipo: "assinatura" },
  fixed_bill: { categoria: "Conta fixa", tipo: "conta" },
  installment: { categoria: "Parcelamento", tipo: "conta" },
};

interface RecurrenceRow {
  description: string;
  type: string;
  amount: number;
  day_of_month: number;
}

/** Próxima ocorrência do dia `day` a partir de hoje — rola pro mês seguinte se o dia já passou. */
export function nextOccurrence(day: number, from: Date): Date {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const candidate = new Date(from.getFullYear(), from.getMonth(), day);
  return candidate < today ? new Date(from.getFullYear(), from.getMonth() + 1, day) : candidate;
}

export function formatDia(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Próximos vencimentos de recorrências ativas (assinaturas, contas fixas, parcelamentos). */
export function useUpcomingBills() {
  const [items, setItems] = useState<Vencimento[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("recurrence_rules")
      .select("description,type,amount,day_of_month")
      .eq("active", true);

    const now = new Date();
    const rows = (data ?? []) as RecurrenceRow[];
    const upcoming: Vencimento[] = rows.map((rule) => {
      const meta = RECURRENCE_META[rule.type] ?? { categoria: "Recorrência", tipo: "conta" as const };
      return {
        descricao: rule.description,
        categoria: meta.categoria,
        valor: Number(rule.amount),
        vence: formatDia(nextOccurrence(rule.day_of_month, now)),
        tipo: meta.tipo,
      };
    });

    setItems(upcoming);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  return { items, loading, refresh } as const;
}
