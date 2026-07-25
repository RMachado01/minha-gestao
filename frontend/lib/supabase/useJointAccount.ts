"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "./client";

export interface HouseholdMember {
  user_id: string;
  role: "owner" | "manager" | "member" | "viewer";
  status: string;
  isSelf: boolean;
}

export interface JointAccountState {
  householdId: string | null;
  householdName: string | null;
  isOwner: boolean;
  joinCode: string | null;
  joinCodeExpiresAt: string | null;
  members: HouseholdMember[];
}

const EMPTY: JointAccountState = {
  householdId: null,
  householdName: null,
  isOwner: false,
  joinCode: null,
  joinCodeExpiresAt: null,
  members: [],
};

export function useJointAccount() {
  const [state, setState] = useState<JointAccountState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setLoading(false);
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError("Não foi possível identificar sua conta.");
      setState(EMPTY);
      setLoading(false);
      return;
    }
    const myId = userData.user.id;

    const { data: membership, error: membershipError } = await supabase
      .from("household_members")
      .select("household_id, role")
      .eq("user_id", myId)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError) {
      setError("Não foi possível carregar sua conta conjunta.");
      setState(EMPTY);
      setLoading(false);
      return;
    }

    if (!membership) {
      setState(EMPTY);
      setLoading(false);
      return;
    }

    const householdId = membership.household_id as string;
    const [householdResult, membersResult] = await Promise.all([
      supabase
        .from("households")
        .select("name, join_code, join_code_expires_at, owner_id")
        .eq("id", householdId)
        .maybeSingle(),
      supabase
        .from("household_members")
        .select("user_id, role, status")
        .eq("household_id", householdId)
        .eq("status", "active"),
    ]);

    const household = householdResult.data;
    const isOwner = household?.owner_id === myId;

    setState({
      householdId,
      householdName: household?.name ?? "Conta conjunta",
      isOwner,
      // O código só é útil para quem convida (dono); membros não precisam vê-lo.
      joinCode: isOwner ? (household?.join_code ?? null) : null,
      joinCodeExpiresAt: isOwner ? (household?.join_code_expires_at ?? null) : null,
      members: (membersResult.data ?? []).map((m) => ({
        user_id: m.user_id as string,
        role: m.role as HouseholdMember["role"],
        status: m.status as string,
        isSelf: m.user_id === myId,
      })),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  /** Gera (ou renova) o código de convite da conta conjunta. */
  const generateInvite = useCallback(async (): Promise<string | null> => {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      return null;
    }
    const { data, error: rpcError } = await supabase.rpc("create_household_invite");
    if (rpcError) {
      setError("Não foi possível gerar o código de convite.");
      return null;
    }
    await refresh();
    return (data as string) ?? null;
  }, [refresh]);

  /** Ingressa em uma conta conjunta usando o código compartilhado. */
  const joinByCode = useCallback(
    async (code: string): Promise<{ ok: boolean; message: string }> => {
      const supabase = createClient();
      if (!supabase) return { ok: false, message: "Supabase não configurado." };
      const trimmed = code.trim();
      if (!trimmed) return { ok: false, message: "Informe o código de convite." };

      const { data, error: rpcError } = await supabase.rpc("join_household_by_code", {
        p_code: trimmed,
      });
      if (rpcError) {
        const raw = rpcError.message || "";
        if (raw.includes("already_in_household")) {
          return { ok: false, message: "Você já faz parte de uma conta conjunta. Saia dela antes de ingressar em outra." };
        }
        if (raw.includes("invalid_code")) {
          return { ok: false, message: "Código inválido ou expirado. Confira com quem enviou." };
        }
        return { ok: false, message: "Não foi possível ingressar. Tente novamente." };
      }
      await refresh();
      return { ok: true, message: `Você ingressou em "${(data as string) ?? "Conta conjunta"}".` };
    },
    [refresh],
  );

  /** Sai da conta conjunta e volta a ter os dados apenas para si. */
  const leave = useCallback(async (): Promise<boolean> => {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      return false;
    }
    const { error: rpcError } = await supabase.rpc("leave_household");
    if (rpcError) {
      setError("Não foi possível sair da conta conjunta.");
      return false;
    }
    await refresh();
    return true;
  }, [refresh]);

  return { state, loading, error, refresh, generateInvite, joinByCode, leave } as const;
}
