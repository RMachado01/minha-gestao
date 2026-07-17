"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "./client";

export interface CreditCardRecord {
  id: string;
  nickname: string;
  brand: string;
  bank: string | null;
  total_limit: number;
  closing_day: number;
  due_day: number;
  color: string | null;
  active: boolean;
  current_bill: number;
  current_bill_status: "open" | "closed" | "paid";
  card_type: "credit" | "benefit";
  benefit_mode: "separate" | "flex" | null;
  vr_balance: number;
  va_balance: number;
  flex_balance: number;
  benefit_balance: number;
  benefit_credit_amount: number | null;
  benefit_credit_day: number | null;
}

export interface CreditCardBillPoint {
  periodo: string;
  referenceMonth: string;
  total: number;
  [key: string]: string | number;
}

interface TransactionBillRow {
  credit_card_id: string;
  reference_month: string;
  total: number | string;
}

interface StoredBillRow {
  credit_card_id: string;
  reference_month: string;
  total_amount: number | string;
  status: "open" | "closed" | "paid";
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(referenceMonth: string) {
  const [year, month] = referenceMonth.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function useCreditCards() {
  const [cards, setCards] = useState<CreditCardRecord[]>([]);
  const [billHistory, setBillHistory] = useState<CreditCardBillPoint[]>([]);
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
    const referenceMonth = monthKey(now);
    const historyStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const historyStartMonth = monthKey(historyStart);
    const [cardsResult, transactionBillsResult, storedBillsResult] = await Promise.all([
      supabase
        .from("credit_cards")
        .select("id,nickname,brand,bank,total_limit,closing_day,due_day,color,active,card_type,benefit_mode,vr_balance,va_balance,flex_balance,benefit_credit_amount,benefit_credit_day")
        .order("nickname"),
      supabase
        .from("vw_fatura_cartao_mensal")
        .select("credit_card_id,reference_month,total")
        .gte("reference_month", historyStartMonth)
        .lte("reference_month", referenceMonth)
        .order("reference_month"),
      supabase
        .from("credit_card_bills")
        .select("credit_card_id,reference_month,total_amount,status")
        .gte("reference_month", historyStartMonth)
        .lte("reference_month", referenceMonth)
        .order("reference_month"),
    ]);

    const { data, error: queryError } = cardsResult;

    if (queryError) {
      setError("Não foi possível carregar seus cartões.");
      setCards([]);
      setBillHistory([]);
    } else {
      const cardRows = data ?? [];
      const creditCardIds = new Set(
        cardRows.filter((card) => card.card_type === "credit").map((card) => card.id),
      );
      const transactionBills = (transactionBillsResult.data ?? []) as TransactionBillRow[];
      const storedBills = (storedBillsResult.data ?? []) as StoredBillRow[];
      const billByCardAndMonth = new Map<string, number>();

      // Lançamentos são a fonte principal. A tabela de faturas completa meses/cartões
      // ainda sem lançamentos agregados, sem somar o mesmo valor duas vezes.
      for (const bill of transactionBills) {
        if (!creditCardIds.has(bill.credit_card_id)) continue;
        const key = `${bill.credit_card_id}:${bill.reference_month}`;
        billByCardAndMonth.set(key, Number(bill.total));
      }
      for (const bill of storedBills) {
        if (!creditCardIds.has(bill.credit_card_id)) continue;
        const key = `${bill.credit_card_id}:${bill.reference_month}`;
        if (!billByCardAndMonth.has(key)) {
          billByCardAndMonth.set(key, Number(bill.total_amount));
        }
      }

      const currentStatusByCard = new Map(
        storedBills
          .filter((bill) => bill.reference_month === referenceMonth)
          .map((bill) => [bill.credit_card_id, bill.status] as const),
      );
      const currentBillByCard = new Map<string, number>();
      for (const [key, total] of billByCardAndMonth) {
        const separator = key.lastIndexOf(":");
        if (key.slice(separator + 1) === referenceMonth) {
          currentBillByCard.set(key.slice(0, separator), total);
        }
      }

      const totalByMonth = new Map<string, number>();
      for (const [key, total] of billByCardAndMonth) {
        const month = key.slice(key.lastIndexOf(":") + 1);
        totalByMonth.set(month, (totalByMonth.get(month) ?? 0) + total);
      }
      const hasHistory = billByCardAndMonth.size > 0;
      setBillHistory(
        hasHistory
          ? Array.from({ length: 12 }, (_, index) => {
              const date = new Date(historyStart.getFullYear(), historyStart.getMonth() + index, 1);
              const month = monthKey(date);
              return {
                periodo: monthLabel(month),
                referenceMonth: month,
                total: totalByMonth.get(month) ?? 0,
              };
            })
          : [],
      );

      if (transactionBillsResult.error && storedBillsResult.error) {
        setError("Seus cartões foram carregados, mas o histórico de faturas está indisponível no momento.");
      } else if (transactionBillsResult.error) {
        setError("O histórico está usando apenas as faturas consolidadas; lançamentos recentes podem demorar a aparecer.");
      }

      setCards(
        cardRows
          .filter((card) => card.active)
          .map((card) => ({
            ...card,
            total_limit: Number(card.total_limit),
            closing_day: Number(card.closing_day),
            due_day: Number(card.due_day),
            vr_balance: Number(card.vr_balance),
            va_balance: Number(card.va_balance),
            flex_balance: Number(card.flex_balance),
            benefit_balance: Number(card.vr_balance) + Number(card.va_balance) + Number(card.flex_balance),
            benefit_credit_amount: card.benefit_credit_amount === null ? null : Number(card.benefit_credit_amount),
            current_bill: currentBillByCard.get(card.id) ?? 0,
            current_bill_status: currentStatusByCard.get(card.id) ?? "open",
          })),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  return { cards, billHistory, loading, error, refresh } as const;
}
