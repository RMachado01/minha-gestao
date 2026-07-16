"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "./client";

export interface CreditCardRecord {
  id: string;
  nickname: string;
  brand: string;
  total_limit: number;
  closing_day: number;
  due_day: number;
  color: string | null;
  active: boolean;
  current_bill: number;
  card_type: "credit" | "benefit";
  benefit_mode: "separate" | "flex" | null;
  vr_balance: number;
  va_balance: number;
  flex_balance: number;
  benefit_balance: number;
}

export function useCreditCards() {
  const [cards, setCards] = useState<CreditCardRecord[]>([]);
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

    const now = new Date();
    const referenceMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const [cardsResult, billsResult] = await Promise.all([
      supabase
        .from("credit_cards")
        .select("id,nickname,brand,total_limit,closing_day,due_day,color,active,card_type,benefit_mode,vr_balance,va_balance,flex_balance")
        .eq("active", true)
        .order("nickname"),
      supabase
        .from("vw_fatura_cartao_mensal")
        .select("credit_card_id,total")
        .eq("reference_month", referenceMonth),
    ]);

    const { data, error: queryError } = cardsResult;
    const billByCard = new Map(
      (billsResult.data ?? []).map((bill) => [bill.credit_card_id, Number(bill.total)]),
    );

    if (queryError) {
      setError("Não foi possível carregar seus cartões.");
      setCards([]);
    } else {
      setCards(
        (data ?? []).map((card) => ({
          ...card,
          total_limit: Number(card.total_limit),
          closing_day: Number(card.closing_day),
          due_day: Number(card.due_day),
          vr_balance: Number(card.vr_balance),
          va_balance: Number(card.va_balance),
          flex_balance: Number(card.flex_balance),
          benefit_balance: Number(card.vr_balance) + Number(card.va_balance) + Number(card.flex_balance),
          current_bill: billByCard.get(card.id) ?? 0,
        })),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  return { cards, loading, error, refresh } as const;
}
