"use client";

import {
  CreditCard,
  Wallet,
  CalendarClock,
  Wifi,
  AlertTriangle,
} from "lucide-react";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { KpiCard } from "@/components/ui/KpiCard";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { CHART } from "@/components/charts/chartTheme";
import { BillCalendar } from "@/components/cards/BillCalendar";
import { CardRegistration } from "@/components/cards/CardRegistration";
import { formatBRL, formatPercent, variacao } from "@/lib/format";
import {
  cartoes,
  cartoesKpis,
  faturasHistorico,
  type Cartao,
} from "@/lib/mock";

/** Limiar de uso do limite que dispara sinal de atenção. */
const ALERTA_USO = 0.7;

const STATUS: Record<
  Cartao["status"],
  { label: string; cls: string; dot: string }
> = {
  aberta: {
    label: "Aberta",
    cls: "text-[var(--color-accent)] bg-[color-mix(in_oklab,var(--color-accent)_16%,transparent)]",
    dot: "bg-[var(--color-accent)]",
  },
  fechada: {
    label: "Fechada",
    cls: "text-warn bg-[color-mix(in_oklab,var(--color-warn)_16%,transparent)]",
    dot: "bg-[var(--color-warn)]",
  },
  paga: {
    label: "Paga",
    cls: "text-pos bg-[color-mix(in_oklab,var(--color-pos)_16%,transparent)]",
    dot: "bg-[var(--color-pos)]",
  },
};

function StatusBadge({ status }: { status: Cartao["status"] }) {
  const s = STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

/** Cartão físico + medidor de limite usado x disponível. */
function CartaoItem({ cartao, delay }: { cartao: Cartao; delay: number }) {
  const uso = cartao.limiteUsado / cartao.limiteTotal;
  const disponivel = cartao.limiteTotal - cartao.limiteUsado;
  const alerta = uso > ALERTA_USO;
  const fillColor = alerta ? "var(--color-warn)" : cartao.cor;

  return (
    <GlassCard
      interactive
      className="col-span-12 flex flex-col gap-4 sm:col-span-3 lg:col-span-4"
    >
      <div
        className="cartao-reveal"
        style={{ animationDelay: `${delay}ms` }}
      >
        {/* --- Cartão físico --- */}
        <div
          className="relative mb-4 h-40 overflow-hidden rounded-2xl p-4"
          style={{
            background: `linear-gradient(135deg, color-mix(in oklab, ${cartao.cor} 60%, #080c16), color-mix(in oklab, ${cartao.cor} 20%, #080c16))`,
            border: `1px solid color-mix(in oklab, ${cartao.cor} 45%, transparent)`,
            boxShadow: `0 18px 40px -26px color-mix(in oklab, ${cartao.cor} 70%, transparent)`,
          }}
        >
          {/* Brilho decorativo */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full opacity-40 blur-2xl"
            style={{ background: cartao.cor }}
          />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                {/* Chip */}
                <span
                  aria-hidden
                  className="h-6 w-8 rounded-[5px] bg-gradient-to-br from-amber-200/90 to-amber-400/70 shadow-inner"
                />
                <Wifi
                  aria-hidden
                  className="h-4 w-4 rotate-90 text-white/70"
                  strokeWidth={2.5}
                />
              </div>
              <span className="text-sm font-semibold tracking-wide text-white/90">
                {cartao.bandeira}
              </span>
            </div>
            <div>
              <p className="tnum text-sm tracking-[0.3em] text-white/55">
                •••• •••• •••• ••••
              </p>
              <p className="mt-1.5 text-base font-semibold text-white">
                {cartao.apelido}
              </p>
            </div>
          </div>
        </div>

        {/* --- Fatura + status --- */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-ink-soft">
            Fatura atual
          </span>
          <StatusBadge status={cartao.status} />
        </div>
        <div className="mt-1 flex items-end justify-between gap-2">
          <span className="tnum text-2xl font-semibold text-ink">
            {formatBRL(cartao.faturaAtual)}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
            <CalendarClock className="h-3.5 w-3.5" strokeWidth={2} />
            vence {cartao.vencimento}
          </span>
        </div>

        {/* --- Medidor de limite --- */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-ink-soft">
              Usado{" "}
              <span className="tnum font-semibold text-ink">
                {formatBRL(cartao.limiteUsado)}
              </span>
            </span>
            <span
              className={`tnum font-semibold ${
                alerta ? "text-warn" : "text-ink-soft"
              }`}
            >
              {formatPercent(uso)}
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-white/[0.07]"
            role="progressbar"
            aria-valuenow={Math.round(uso * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Limite usado do cartão ${cartao.apelido}`}
          >
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${uso * 100}%`, background: fillColor }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-ink-muted">
            <span>
              Disponível{" "}
              <span className="tnum text-ink-soft">
                {formatBRL(disponivel)}
              </span>
            </span>
            <span className="tnum">
              limite {formatBRL(cartao.limiteTotal)}
            </span>
          </div>
        </div>

        {alerta && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[color-mix(in_oklab,var(--color-warn)_14%,transparent)] px-2.5 py-1.5 text-xs font-medium text-warn">
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.25} />
            Uso acima de {Math.round(ALERTA_USO * 100)}% do limite
          </div>
        )}
      </div>
    </GlassCard>
  );
}

export default function CartoesPage() {
  const { limiteTotal, limiteUsado, faturasEmAberto, proximoVencimento } =
    cartoesKpis;
  const usoGlobal = limiteUsado / limiteTotal;
  const disponivelGlobal = limiteTotal - limiteUsado;

  // Tendência da fatura consolidada: mês atual vs. anterior (cair = bom → invert).
  const atual = faturasHistorico[faturasHistorico.length - 1].total as number;
  const anterior = faturasHistorico[faturasHistorico.length - 2].total as number;
  const tendenciaFatura = variacao(atual, anterior);

  return (
    <section className="flex flex-col gap-6">
      <style>{`
        @keyframes mgCartaoReveal {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cartao-reveal { animation: mgCartaoReveal 0.5s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--color-accent)_16%,transparent)] text-[var(--color-accent)]">
          <CreditCard className="h-5 w-5" strokeWidth={2} />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-ink">Cartões de Crédito</h1>
          <p className="text-sm text-ink-muted">
            Limite, faturas em aberto e vencimentos consolidados
          </p>
        </div>
        </div>
        <CardRegistration />
      </div>

      {/* --- KPIs consolidados --- */}
      <BentoGrid>
        {/* Hero: faturas em aberto (destaque) */}
        <GlassCard
          strong
          className="col-span-12 flex flex-col justify-between gap-5 lg:col-span-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-sm font-medium text-ink-soft">
                Faturas em aberto
              </span>
              <div className="mt-2 flex items-end gap-3">
                <span className="tnum text-4xl font-bold text-ink sm:text-5xl">
                  {formatBRL(faturasEmAberto)}
                </span>
                <TrendBadge value={tendenciaFatura} invert className="mb-1" />
              </div>
              <p className="mt-1.5 text-xs text-ink-muted">
                Soma das faturas atuais dos {cartoes.length} cartões · vs. mês
                anterior
              </p>
            </div>
          </div>

          {/* Uso global do limite */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-ink-soft">Uso total do limite</span>
              <span className="tnum font-semibold text-ink">
                {formatPercent(usoGlobal)}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${usoGlobal * 100}%`,
                  background: `linear-gradient(90deg, ${CHART.accent}, ${CHART.accent2})`,
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-ink-muted">
              <span>
                Usado{" "}
                <span className="tnum text-ink-soft">
                  {formatBRL(limiteUsado)}
                </span>
              </span>
              <span>
                Total{" "}
                <span className="tnum text-ink-soft">
                  {formatBRL(limiteTotal)}
                </span>
              </span>
            </div>
          </div>
        </GlassCard>

        <KpiCard
          className="col-span-6 lg:col-span-3"
          label="Limite disponível"
          value={formatBRL(disponivelGlobal)}
          tone="pos"
          icon={<Wallet className="h-4 w-4" strokeWidth={2} />}
          hint={`de ${formatBRL(limiteTotal)} no total`}
        />
        <KpiCard
          className="col-span-6 lg:col-span-3"
          label="Próximo vencimento"
          value={proximoVencimento}
          icon={<CalendarClock className="h-4 w-4" strokeWidth={2} />}
          hint="Nubank · fatura aberta"
        />
      </BentoGrid>

      {/* --- Um card por cartão --- */}
      <div>
        <SectionHeader
          title="Seus cartões"
          subtitle={`${cartoes.length} cartões · limite usado x disponível`}
        />
        <BentoGrid>
          {cartoes.map((cartao, i) => (
            <CartaoItem key={cartao.id} cartao={cartao} delay={i * 90} />
          ))}
        </BentoGrid>
      </div>

      {/* --- Histórico das faturas --- */}
      <GlassCard>
        <BillCalendar />
      </GlassCard>

      <GlassCard>
        <SectionHeader
          title="Total das faturas mês a mês"
          subtitle="Evolução do valor consolidado em aberto"
          action={
            <TrendBadge value={tendenciaFatura} invert className="shrink-0" />
          }
        />
        <TrendLineChart
          data={faturasHistorico}
          xKey="periodo"
          series={[
            {
              key: "total",
              label: "Total das faturas",
              color: CHART.accent,
              area: true,
            },
          ]}
          height={280}
        />
      </GlassCard>
    </section>
  );
}
