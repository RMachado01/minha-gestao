import Link from "next/link";
import { ArrowRight, CircleGauge, Database, ShieldAlert, Target } from "lucide-react";
import { BunnyPaw } from "@/components/ui/BunnyPaw";
import { formatBRL, formatPercent } from "@/lib/format";

interface DailyBriefingProps {
  balance: number;
  savingsRate: number;
  balanceTrend: number;
  urgentBills: number;
  urgentTotal: number;
  cardUsage: number;
  hasGoal: boolean;
}

export function DailyBriefing({
  balance,
  savingsRate,
  balanceTrend,
  urgentBills,
  urgentTotal,
  cardUsage,
  hasGoal,
}: DailyBriefingProps) {
  const status = balance < 0 || savingsRate < 0
    ? { title: "O mês pede atenção", text: `Seu saldo está em ${formatBRL(balance)}. Priorize compromissos e reduza saídas não essenciais.`, Icon: ShieldAlert }
    : savingsRate >= 0.2
      ? { title: "Sua margem está saudável", text: `${formatPercent(savingsRate)} das entradas ficaram livres neste mês. Você pode acelerar uma meta sem perder liquidez.`, Icon: CircleGauge }
      : { title: "Há espaço para ganhar margem", text: `Você preservou ${formatPercent(savingsRate)} das entradas. Um pequeno ajuste recorrente já melhora a trajetória.`, Icon: CircleGauge };

  const nextAction = urgentBills > 0
    ? { text: `${urgentBills} compromisso${urgentBills > 1 ? "s" : ""} vence${urgentBills === 1 ? "" : "m"} em até 3 dias, somando ${formatBRL(urgentTotal)}.`, href: "/planejamento", label: "Revisar agenda" }
    : cardUsage >= 0.7
      ? { text: `Os cartões já usam ${formatPercent(cardUsage)} do limite total. Revise a fatura antes de novos gastos.`, href: "/cartoes", label: "Ver cartões" }
      : hasGoal
        ? { text: "Sua conta está estável para revisar o próximo aporte e a data projetada da meta principal.", href: "/metas", label: "Abrir projeção" }
        : { text: "Crie uma meta para transformar sua sobra mensal em um plano com prazo e projeção.", href: "/metas", label: "Criar meta" };
  const StatusIcon = status.Icon;

  return (
    <aside className="ai-surface col-span-12 flex min-h-full flex-col rounded-[var(--radius-card-lg)] p-5 lg:col-span-4 lg:p-6" aria-labelledby="daily-briefing-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow ai-accent flex items-center gap-2"><BunnyPaw className="size-3.5" />Inteligência da conta</p>
          <h2 id="daily-briefing-title" className="display-font mt-2 text-[1.75rem] font-medium leading-[1.05] tracking-[-.025em] text-ink">Briefing de hoje</h2>
        </div>
        <span className="ai-proof"><Database className="size-3" />Dados do mês</span>
      </div>

      <div className="mt-7 flex flex-1 flex-col">
        <span className="grid size-10 place-items-center rounded-xl bg-[var(--ai-surface)] ai-accent"><StatusIcon className="size-[1.1rem]" /></span>
        <h3 className="mt-4 text-base font-semibold tracking-[-.02em] text-ink">{status.title}</h3>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{status.text}</p>

        <div className="my-5 h-px bg-[var(--color-line)]" />

        <div className="flex gap-3">
          <Target className="mt-0.5 size-4 shrink-0 ai-accent" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.08em] text-ink-muted">Próxima melhor ação</p>
            <p className="mt-1.5 text-sm leading-6 text-ink-soft">{nextAction.text}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--color-line)] pt-4">
        <span className="text-[11px] text-ink-muted">Saldo {balanceTrend >= 0 ? "em evolução" : "em retração"} no comparativo mensal</span>
        <Link href={nextAction.href} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold ai-accent transition-colors hover:bg-[var(--ai-surface)]">
          {nextAction.label}<ArrowRight className="size-3.5" />
        </Link>
      </div>
    </aside>
  );
}
