"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, ArrowUpCircle, ArrowDownCircle, Tv, CreditCard, Home, LoaderCircle } from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { createClient } from "@/lib/supabase/client";
import { useRecurrences, type RecurrenceType } from "@/lib/supabase/useRecurrences";
import { detectSubscriptionBrand } from "@/lib/subscriptions";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/cn";

type Kind = "income" | "expense" | "subscription" | "installment" | "fixed_bill";

const KIND_COLOR: Record<Kind, string> = {
  income: "#10b981",
  expense: "#f2706e",
  subscription: "#a855f7",
  installment: "#3b82f6",
  fixed_bill: "#7c8b82",
};

const KIND_LABEL: Record<Kind, string> = {
  income: "Receita",
  expense: "Despesa",
  subscription: "Assinatura",
  installment: "Parcela",
  fixed_bill: "Conta fixa",
};

const RECURRENCE_KIND: Record<RecurrenceType, Kind> = {
  income: "income",
  subscription: "subscription",
  installment: "installment",
  fixed_bill: "fixed_bill",
};

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

interface TxRow {
  id: string;
  description: string;
  amount: number | string;
  occurred_on: string;
  type: "income" | "expense" | "benefit";
  category: string;
}

interface DayEntry {
  key: string;
  kind: Kind;
  description: string;
  amount: number;
  real: boolean; // true = já lançado; false = previsto (recorrência)
  due: boolean; // previsto a vencer (hoje ou futuro)
  brand: ReturnType<typeof detectSubscriptionBrand>;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function CalendarioPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based
  const [selected, setSelected] = useState(todayStr());
  // Transações reais do mês, com a data (DayEntry não guarda a data).
  const [datedTx, setDatedTx] = useState<{ date: string; entry: DayEntry }[]>([]);
  const [loading, setLoading] = useState(true);

  const { items: recurrences } = useRecurrences();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const today = todayStr();

  // Carrega as transações reais do mês visível.
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      if (!supabase) {
        setDatedTx([]);
        setLoading(false);
        return;
      }
      const first = `${year}-${pad(month + 1)}-01`;
      const last = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;
      const { data } = await supabase
        .from("transactions")
        .select("id,description,amount,occurred_on,type,category")
        .gte("occurred_on", first)
        .lte("occurred_on", last);
      if (!active) return;
      const dated = ((data ?? []) as TxRow[])
        .filter((r) => r.type !== "benefit")
        .map((r) => ({
          date: r.occurred_on.slice(0, 10),
          entry: {
            key: `tx-${r.id}`,
            kind: (r.type === "income" ? "income" : "expense") as Kind,
            description: r.description,
            amount: Number(r.amount),
            real: true,
            due: false,
            brand: null,
          } satisfies DayEntry,
        }));
      setDatedTx(dated);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [year, month, daysInMonth]);

  // Monta o mapa data → entradas (transações reais + recorrências previstas).
  const byDate = useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    for (const { date, entry } of datedTx) {
      const arr = map.get(date) ?? [];
      arr.push(entry);
      map.set(date, arr);
    }
    for (const r of recurrences) {
      if (!r.active) continue;
      const dueDay = Math.min(r.day_of_month, daysInMonth);
      const date = `${year}-${pad(month + 1)}-${pad(dueDay)}`;
      const arr = map.get(date) ?? [];
      arr.push({
        key: `rec-${r.id}`,
        kind: RECURRENCE_KIND[r.type],
        description: r.description,
        amount: r.amount,
        real: false,
        due: date >= today,
        brand: r.type === "subscription" ? detectSubscriptionBrand(r.description) : null,
      });
      map.set(date, arr);
    }
    return map;
  }, [datedTx, recurrences, year, month, daysInMonth, today]);

  const selectedEntries = byDate.get(selected) ?? [];
  const selectedDate = selected ? new Date(`${selected}T12:00:00`) : null;

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }
  function goToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelected(today);
  }

  // Células do grid (com brancos iniciais).
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <section className="gz-page flex flex-col gap-6">
      <PageHeader
        eyebrow="Finanças"
        title="Calendário"
        description="Veja lançamentos, assinaturas, parcelas e contas do mês em um só lugar. Toque em um dia para ver os detalhes."
      />

      <GlassCard variant="liquid" className="flex flex-col gap-4">
        {/* Navegação do mês */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => shiftMonth(-1)} className="grid size-11 place-items-center rounded-xl border border-[var(--color-line)] text-ink-soft hover:text-ink" aria-label="Mês anterior">
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-ink">{MONTHS[month]} {year}</h2>
            <button type="button" onClick={goToday} className="rounded-full border border-[var(--color-line)] px-3 py-1 text-xs font-medium text-ink-soft hover:border-accent hover:text-ink">Hoje</button>
          </div>
          <button type="button" onClick={() => shiftMonth(1)} className="grid size-11 place-items-center rounded-xl border border-[var(--color-line)] text-ink-soft hover:text-ink" aria-label="Próximo mês">
            <ChevronRight className="size-5" />
          </button>
        </div>

        {/* Cabeçalho dos dias */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{w}</span>
          ))}
        </div>

        {/* Grade */}
        {loading ? (
          <p className="flex items-center gap-2 py-8 text-sm text-ink-muted"><LoaderCircle className="size-4 animate-spin" />Carregando o mês…</p>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <span key={i} />;
              const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
              const entries = byDate.get(dateStr) ?? [];
              const kinds = Array.from(new Set(entries.map((e) => e.kind)));
              const isToday = dateStr === today;
              const isSelected = dateStr === selected;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(dateStr)}
                  aria-label={`Dia ${day}${entries.length ? `, ${entries.length} item(ns)` : ""}`}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-start gap-1 rounded-xl border p-1.5 pt-2 transition-colors",
                    isSelected ? "border-accent bg-accent/12" : "border-transparent hover:bg-white/[0.04]",
                  )}
                >
                  <span className={cn("grid size-6 place-items-center rounded-full text-xs tabular-nums", isToday && !isSelected && "bg-accent/15 font-bold text-accent", isSelected && "font-bold text-ink", !isToday && !isSelected && "text-ink-soft")}>{day}</span>
                  <span className="flex h-1.5 items-center gap-0.5">
                    {kinds.slice(0, 4).map((k) => (
                      <span key={k} className="size-1.5 rounded-full" style={{ background: KIND_COLOR[k] }} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Legenda */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-[var(--color-line)] pt-3">
          {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
              <span className="size-2 rounded-full" style={{ background: KIND_COLOR[k] }} />
              {KIND_LABEL[k]}
            </span>
          ))}
        </div>
      </GlassCard>

      {/* Detalhes do dia selecionado */}
      <GlassCard variant="liquid" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-accent" />
          <h2 className="text-sm font-semibold text-ink">
            {selectedDate ? selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : "Selecione um dia"}
          </h2>
        </div>

        {selectedEntries.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">Nenhum lançamento ou conta neste dia.</p>
        ) : (
          <div className="divide-y divide-[var(--color-line)]">
            {selectedEntries
              .sort((a, b) => Number(a.real) - Number(b.real))
              .map((e) => (
                <DayRow key={e.key} entry={e} />
              ))}
          </div>
        )}
      </GlassCard>
    </section>
  );
}

function DayRow({ entry }: { entry: DayEntry }) {
  const color = KIND_COLOR[entry.kind];
  const Icon = entry.kind === "income" ? ArrowUpCircle : entry.kind === "subscription" ? Tv : entry.kind === "installment" ? CreditCard : entry.kind === "fixed_bill" ? Home : ArrowDownCircle;
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {entry.brand ? (
          <BrandLogo label={entry.brand.label} domain={entry.brand.domain} color={entry.brand.color} textColor={entry.brand.textColor} size={36} />
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${color} 30%, transparent)` }}>
            <Icon className="size-4" strokeWidth={2} />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{entry.description}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-muted">
            {KIND_LABEL[entry.kind]}
            {!entry.real && <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium" style={{ color }}>{entry.due ? "a vencer" : "prevista"}</span>}
          </p>
        </div>
      </div>
      <span className={cn("tnum shrink-0 text-sm font-semibold", entry.kind === "income" ? "text-pos" : "text-ink")}>
        {entry.kind === "income" ? "+" : "−"} {formatBRL(entry.amount)}
      </span>
    </div>
  );
}
