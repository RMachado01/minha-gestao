"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "./client";

export interface GoalTeaser {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
}

/** Meta ativa mais próxima de ser concluída — teaser leve para o dashboard. */
export function useGoalsTeaser() {
  const [goal, setGoal] = useState<GoalTeaser | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setGoal(null);
      setActiveCount(0);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("financial_goals")
      .select("id,name,target_amount,current_amount")
      .eq("status", "active");

    const goals = (data ?? []) as Array<{ id: string; name: string; target_amount: number; current_amount: number }>;
    setActiveCount(goals.length);
    const closest = goals
      .map((item) => ({ id: item.id, name: item.name, targetAmount: Number(item.target_amount), currentAmount: Number(item.current_amount) }))
      .sort((a, b) => b.currentAmount / b.targetAmount - a.currentAmount / a.targetAmount)[0];
    setGoal(closest ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  return { goal, activeCount, loading, refresh } as const;
}
