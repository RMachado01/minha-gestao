import { CalendarDays } from "lucide-react";
import { cartoes } from "@/lib/mock";
import { formatBRL } from "@/lib/format";

const days = Array.from({ length: 35 }, (_, index) => index - 2);

export function BillCalendar() {
  const bills = new Map(cartoes.map((card) => [Number(card.vencimento.slice(0, 2)), card]));
  return (
    <section aria-labelledby="bill-calendar-title">
      <div className="mb-5 flex items-center justify-between"><div><h3 id="bill-calendar-title" className="flex items-center gap-2 font-semibold text-ink"><CalendarDays className="size-4 text-accent" />Calendário de vencimentos</h3><p className="mt-1 text-sm text-ink-muted">Julho de 2026 · todas as faturas</p></div><span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-accent">3 vencimentos</span></div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-muted">{["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((day) => <span key={day} className="py-2 font-medium">{day}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const card = bills.get(day);
          const valid = day >= 1 && day <= 31;
          return <div key={index} className={`min-h-20 rounded-xl border p-2 text-xs ${valid ? "border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-surface-2)_55%,transparent)]" : "border-transparent opacity-0"}`}><span className="tnum text-ink-muted">{valid ? day : ""}</span>{card && <div className="mt-1 rounded-lg p-1.5 text-left" style={{ background: `color-mix(in oklab, ${card.cor} 17%, transparent)` }}><p className="truncate font-semibold text-ink">{card.apelido}</p><p className="tnum mt-0.5 truncate text-ink-soft">{formatBRL(card.faturaAtual)}</p></div>}</div>;
        })}
      </div>
    </section>
  );
}
