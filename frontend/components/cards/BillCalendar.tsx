import { CalendarDays } from "lucide-react";
import { formatBRL } from "@/lib/format";
import type { Cartao } from "@/lib/data/empty";

export function BillCalendar({ cards }: { cards: Cartao[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const monthDays = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: 42 }, (_, index) => index - firstWeekday + 1);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(now);
  const bills = cards.reduce((map, card) => {
    const day = Number(card.vencimento.slice(0, 2));
    map.set(day, [...(map.get(day) ?? []), card]);
    return map;
  }, new Map<number, Cartao[]>());
  return (
    <section aria-labelledby="bill-calendar-title">
      <div className="mb-5 flex items-center justify-between"><div><h3 id="bill-calendar-title" className="flex items-center gap-2 font-semibold text-ink"><CalendarDays className="size-4 text-accent" />Calendário de vencimentos</h3><p className="mt-1 text-sm capitalize text-ink-muted">{monthLabel} · todas as faturas</p></div><span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">{cards.length} vencimento{cards.length === 1 ? "" : "s"}</span></div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-muted">{["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((day) => <span key={day} className="py-2 font-medium">{day}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const dayCards = bills.get(day) ?? [];
          const valid = day >= 1 && day <= monthDays;
          return <div key={index} className={`min-h-20 rounded-xl border p-2 text-xs ${valid ? "border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-surface-2)_55%,transparent)]" : "border-transparent opacity-0"}`}><span className="tnum text-ink-muted">{valid ? day : ""}</span>{dayCards.map((card) => <div key={card.id} className="mt-1 rounded-lg p-1.5 text-left" style={{ background: `color-mix(in oklab, ${card.cor} 17%, transparent)` }}><p className="truncate font-semibold text-ink">{card.apelido}</p><p className="tnum mt-0.5 truncate text-ink-soft">{formatBRL(card.faturaAtual)}</p></div>)}</div>;
        })}
      </div>
    </section>
  );
}
