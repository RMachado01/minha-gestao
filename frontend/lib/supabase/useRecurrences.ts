"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "./client";

export type RecurrenceType = "subscription" | "installment" | "fixed_bill" | "income";

export interface RecurrenceRule {
  id: string;
  description: string;
  type: RecurrenceType;
  amount: number;
  day_of_month: number;
  active: boolean;
  total_installments: number | null;
  current_installment: number | null;
}

interface RawRecurrenceRule extends Omit<RecurrenceRule, "amount"> {
  amount: number | string;
}

export function useRecurrences() {
  const [items, setItems] = useState<RecurrenceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setItems([]);
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await supabase
      .from("recurrence_rules")
      .select("id,description,type,amount,day_of_month,active,total_installments,current_installment")
      .order("active", { ascending: false })
      .order("day_of_month", { ascending: true });

    if (queryError) {
      setError("Não foi possível carregar as recorrências.");
      setItems([]);
    } else {
      setItems(((data ?? []) as RawRecurrenceRule[]).map((rule) => ({ ...rule, amount: Number(rule.amount) })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  return { items, loading, error, refresh } as const;
}
