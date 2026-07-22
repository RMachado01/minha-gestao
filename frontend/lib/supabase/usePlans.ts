"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "./client";

export interface CategoryBudget {
  id: string;
  category: string;
  limit_amount: number;
  active: boolean;
}

export interface SpendingAlert {
  id: string;
  name: string;
  /** null = alerta sobre o gasto total do mês. */
  category: string | null;
  threshold_amount: number;
  active: boolean;
}

interface RawBudget extends Omit<CategoryBudget, "limit_amount"> {
  limit_amount: number | string;
}
interface RawAlert extends Omit<SpendingAlert, "threshold_amount"> {
  threshold_amount: number | string;
}

/** Erro de "tabela inexistente" (migração ainda não aplicada). */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || /does not exist/i.test(error.message ?? "");
}

export function usePlans() {
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [alerts, setAlerts] = useState<SpendingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /** false quando as tabelas ainda não existem no banco (migração pendente). */
  const [ready, setReady] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setLoading(false);
      return;
    }

    const [budgetRes, alertRes] = await Promise.all([
      supabase.from("category_budgets").select("id,category,limit_amount,active").order("category"),
      supabase.from("spending_alerts").select("id,name,category,threshold_amount,active").order("created_at"),
    ]);

    if (isMissingTable(budgetRes.error) || isMissingTable(alertRes.error)) {
      setReady(false);
      setBudgets([]);
      setAlerts([]);
      setLoading(false);
      return;
    }

    if (budgetRes.error || alertRes.error) {
      setError("Não foi possível carregar seus planos.");
      setLoading(false);
      return;
    }

    setReady(true);
    setBudgets(((budgetRes.data ?? []) as RawBudget[]).map((b) => ({ ...b, limit_amount: Number(b.limit_amount) })));
    setAlerts(((alertRes.data ?? []) as RawAlert[]).map((a) => ({ ...a, threshold_amount: Number(a.threshold_amount) })));
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  /** Cria ou atualiza o teto de uma categoria (upsert por user_id+category). */
  const saveBudget = useCallback(async (category: string, limit_amount: number) => {
    const supabase = createClient();
    if (!supabase) return { error: "Supabase não configurado." };
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { error: "Sessão expirada." };
    const { error: upsertError } = await supabase
      .from("category_budgets")
      .upsert(
        { user_id: userId, category, limit_amount, active: true, updated_at: new Date().toISOString() },
        { onConflict: "user_id,category" },
      );
    if (upsertError) return { error: "Não foi possível salvar o orçamento." };
    await refresh();
    return { error: "" };
  }, [refresh]);

  const deleteBudget = useCallback(async (id: string) => {
    const supabase = createClient();
    if (!supabase) return { error: "Supabase não configurado." };
    const { error: delError } = await supabase.from("category_budgets").delete().eq("id", id);
    if (delError) return { error: "Não foi possível remover o orçamento." };
    await refresh();
    return { error: "" };
  }, [refresh]);

  const addAlert = useCallback(async (name: string, category: string | null, threshold_amount: number) => {
    const supabase = createClient();
    if (!supabase) return { error: "Supabase não configurado." };
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return { error: "Sessão expirada." };
    const { error: insertError } = await supabase
      .from("spending_alerts")
      .insert({ user_id: userId, name, category, threshold_amount, active: true });
    if (insertError) return { error: "Não foi possível criar o alerta." };
    await refresh();
    return { error: "" };
  }, [refresh]);

  const toggleAlert = useCallback(async (id: string, active: boolean) => {
    const supabase = createClient();
    if (!supabase) return { error: "Supabase não configurado." };
    const { error: updError } = await supabase.from("spending_alerts").update({ active }).eq("id", id);
    if (updError) return { error: "Não foi possível atualizar o alerta." };
    await refresh();
    return { error: "" };
  }, [refresh]);

  const deleteAlert = useCallback(async (id: string) => {
    const supabase = createClient();
    if (!supabase) return { error: "Supabase não configurado." };
    const { error: delError } = await supabase.from("spending_alerts").delete().eq("id", id);
    if (delError) return { error: "Não foi possível remover o alerta." };
    await refresh();
    return { error: "" };
  }, [refresh]);

  return { budgets, alerts, loading, error, ready, refresh, saveBudget, deleteBudget, addAlert, toggleAlert, deleteAlert } as const;
}
