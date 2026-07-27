"use client";

import { useState } from "react";
import {
  CreditCard,
  Wallet,
  CalendarClock,
  Wifi,
  AlertTriangle,
  Pencil,
  Trash2,
  Utensils,
} from "lucide-react";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { CHART } from "@/components/charts/chartTheme";
import { BillCalendar } from "@/components/cards/BillCalendar";
import { CardRegistration } from "@/components/cards/CardRegistration";
import { CardManagementDialog } from "@/components/cards/CardManagementDialog";
import { CardBrandMark } from "@/components/cards/CardBrandMark";
import { RaiseCelebration } from "@/components/ui/RaiseCelebration";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { BANKS, getBrand } from "@/lib/brands";
import { formatBRL, formatPercent, variacao } from "@/lib/format";
import type { Cartao } from "@/lib/data/empty";
import { useCreditCards, type CreditCardRecord } from "@/lib/supabase/useCreditCards";

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
function CartaoItem({ cartao, record, delay, onEdit, onDelete }: { cartao: Cartao; record: CreditCardRecord; delay: number; onEdit: (card: CreditCardRecord) => void; onDelete: (card: CreditCardRecord) => void }) {
  const uso = cartao.limiteUsado / cartao.limiteTotal;
  const disponivel = cartao.limiteTotal - cartao.limiteUsado;
  const alerta = uso > ALERTA_USO;
  const bancoIdentity = cartao.banco && cartao.banco !== "Outro" ? getBrand(BANKS, cartao.banco) : null;
  const corBase = bancoIdentity?.color ?? cartao.cor;
  const fillColor = alerta ? "var(--color-warn)" : corBase;

  return (
    <GlassCard
      variant="liquid"
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
            background: `linear-gradient(135deg, color-mix(in oklab, ${corBase} 60%, #080c16), color-mix(in oklab, ${corBase} 20%, #080c16))`,
            border: `1px solid color-mix(in oklab, ${corBase} 45%, transparent)`,
            boxShadow: `0 18px 40px -26px color-mix(in oklab, ${corBase} 70%, transparent)`,
          }}
        >
          {/* Brilho decorativo */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full opacity-40 blur-2xl"
            style={{ background: corBase }}
          />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                {bancoIdentity?.domain && (
                  <BrandLogo
                    label={bancoIdentity.label}
                    domain={bancoIdentity.domain}
                    color={bancoIdentity.color}
                    textColor={bancoIdentity.textColor}
                    size={28}
                  />
                )}
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
              <CardBrandMark brand={cartao.bandeira} />
            </div>
            <div>
              <p className="tnum text-sm tracking-[0.3em] text-white/55">
                •••• •••• •••• ••••
              </p>
              <div className="mt-1.5 flex items-end justify-between gap-2">
                <p className="text-base font-semibold text-white">
                  {cartao.apelido}
                </p>
                {bancoIdentity && (
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-white/75">
                    {bancoIdentity.label}
                  </span>
                )}
              </div>
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

        <div className="mt-4 flex gap-2 border-t border-[var(--color-line)] pt-4">
          <button type="button" onClick={() => onEdit(record)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-accent hover:bg-accent/10 hover:text-ink" aria-label={`Editar cartão ${cartao.apelido}`}><Pencil className="size-3.5" />Editar</button>
          <button type="button" onClick={() => onDelete(record)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-400/20 px-3 py-2 text-xs font-semibold text-neg transition hover:bg-rose-400/10" aria-label={`Excluir cartão ${cartao.apelido}`}><Trash2 className="size-3.5" />Excluir</button>
        </div>
      </div>
    </GlassCard>
  );
}

function BenefitCardItem({ record, delay, onEdit, onDelete }: { record: CreditCardRecord; delay: number; onEdit: (card: CreditCardRecord) => void; onDelete: (card: CreditCardRecord) => void }) {
  return (
    <GlassCard variant="liquid" interactive className="col-span-12 sm:col-span-6 lg:col-span-4">
      <div className="cartao-reveal" style={{ animationDelay: `${delay}ms` }}>
        <div className="relative mb-4 h-40 overflow-hidden rounded-2xl p-4" style={{ background: `linear-gradient(135deg, color-mix(in oklab, ${record.color ?? "#00a86b"} 64%, #08140f), color-mix(in oklab, ${record.color ?? "#00a86b"} 22%, #08140f))` }}>
          <div className="relative flex h-full flex-col justify-between text-white">
            <div className="flex items-start justify-between"><span className="grid size-9 place-items-center rounded-xl bg-white/15"><Utensils className="size-5" /></span><span className="text-sm font-semibold text-white/85">{record.brand}</span></div>
            <div><p className="text-xs font-medium uppercase tracking-[.18em] text-white/60">{record.benefit_mode === "flex" ? "Saldo flexível" : "VR + VA"}</p><p className="mt-1 text-base font-semibold">{record.nickname}</p></div>
          </div>
        </div>
        <div className="flex items-end justify-between"><div><p className="text-xs text-ink-muted">Saldo disponível</p><p className="tnum mt-1 text-2xl font-semibold text-ink">{formatBRL(record.benefit_balance)}</p></div><span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-pos">Ativo</span></div>
        {record.benefit_mode === "separate" ? <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-white/[.04] p-3"><p className="text-xs text-ink-muted">Vale-refeição</p><p className="tnum mt-1 font-semibold text-ink">{formatBRL(record.vr_balance)}</p></div><div className="rounded-2xl bg-white/[.04] p-3"><p className="text-xs text-ink-muted">Vale-alimentação</p><p className="tnum mt-1 font-semibold text-ink">{formatBRL(record.va_balance)}</p></div></div> : <p className="mt-4 rounded-2xl bg-white/[.04] p-3 text-xs text-ink-soft">Um único saldo pode ser usado em compras de alimentação.</p>}
        <div className="mt-4 flex gap-2 border-t border-[var(--color-line)] pt-4"><button type="button" onClick={() => onEdit(record)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] px-3 py-2 text-xs font-semibold text-ink-soft hover:border-accent"><Pencil className="size-3.5" />Editar</button><button type="button" onClick={() => onDelete(record)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-400/20 px-3 py-2 text-xs font-semibold text-neg"><Trash2 className="size-3.5" />Excluir</button></div>
      </div>
    </GlassCard>
  );
}

export default function CartoesPage() {
  const { cards: storedCards, billHistory, loading, error, refresh } = useCreditCards();
  const [managedCard, setManagedCard] = useState<CreditCardRecord | null>(null);
  const [dialogMode, setDialogMode] = useState<"edit" | "delete">("edit");
  const [celebration, setCelebration] = useState("");
  const creditRecords = storedCards.filter((card) => card.card_type === "credit");
  const benefitRecords = storedCards.filter((card) => card.card_type === "benefit");
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  const cartoes: Cartao[] = creditRecords.map((card) => ({
    id: card.id,
    apelido: card.nickname,
    bandeira: card.brand,
    banco: card.bank ?? "",
    limiteTotal: card.total_limit,
    // Limite comprometido = fatura atual (se não paga) + parcelas futuras a vencer.
    limiteUsado: (card.current_bill_status === "paid" ? 0 : card.current_bill) + card.committed_installments,
    faturaAtual: card.current_bill,
    vencimento: `${String(card.due_day).padStart(2, "0")}/${month}`,
    status: card.current_bill_status === "paid" ? "paga" : card.current_bill_status === "closed" ? "fechada" : "aberta",
    cor: card.color ?? "#006b3f",
  }));
  const limiteTotal = cartoes.reduce((sum, card) => sum + card.limiteTotal, 0);
  const limiteUsado = cartoes.reduce((sum, card) => sum + card.limiteUsado, 0);
  const faturasEmAberto = cartoes.reduce((sum, card) => sum + (card.status === "paga" ? 0 : card.faturaAtual), 0);
  const proximoVencimento = cartoes.length > 0
    ? cartoes.map((card) => card.vencimento).sort((a, b) => Number(a.slice(0, 2)) - Number(b.slice(0, 2)))[0]
    : "—";
  const usoGlobal = limiteTotal > 0 ? limiteUsado / limiteTotal : 0;
  const disponivelGlobal = limiteTotal - limiteUsado;

  // Tendência da fatura consolidada: mês atual vs. anterior (cair = bom → invert).
  const atual = Number(billHistory.at(-1)?.total ?? 0);
  const anterior = Number(billHistory.at(-2)?.total ?? 0);
  const tendenciaFatura = anterior > 0 ? variacao(atual, anterior) : 0;

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
          <h1 className="text-xl font-semibold text-ink">Cartões</h1>
          <p className="text-sm text-ink-muted">
            Crédito, faturas e saldos de alimentação
          </p>
        </div>
        </div>
        <CardRegistration onSaved={refresh} />
      </div>

      {error && (
        <div role="status" className="flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-warn">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* --- KPIs consolidados --- */}
      <BentoGrid>
        {/* Hero: faturas em aberto (destaque) */}
        <GlassCard
          variant="hero"
          className="col-span-12 flex flex-col justify-between gap-5 lg:col-span-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-sm font-medium text-ink-soft">
                Faturas em aberto
              </span>
              <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="tnum min-w-0 shrink break-words text-4xl font-bold text-ink sm:text-5xl">
                  {loading ? "—" : formatBRL(faturasEmAberto)}
                </span>
                {!loading && billHistory.length > 1 && <TrendBadge value={tendenciaFatura} invert className="mb-1 shrink-0" />}
              </div>
              <p className="mt-1.5 text-xs text-ink-muted">
                {loading ? "Consultando suas faturas..." : `Soma das faturas atuais dos ${cartoes.length} cartões · vs. mês anterior`}
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
          className="col-span-12 sm:col-span-6 lg:col-span-3"
          label="Limite disponível"
          value={loading ? "—" : formatBRL(disponivelGlobal)}
          tone="pos"
          icon={<Wallet className="h-4 w-4" strokeWidth={2} />}
          hint={loading ? "Carregando limites..." : `de ${formatBRL(limiteTotal)} no total`}
        />
        <KpiCard
          className="col-span-12 sm:col-span-6 lg:col-span-3"
          label="Próximo vencimento"
          value={loading ? "—" : proximoVencimento}
          icon={<CalendarClock className="h-4 w-4" strokeWidth={2} />}
          hint={loading ? "Carregando vencimentos..." : cartoes.length > 0 ? "Próxima fatura em aberto" : "Nenhum cartão cadastrado"}
        />
      </BentoGrid>

      {/* --- Um card por cartão --- */}
      <div>
        <SectionHeader
          title="Seus cartões"
          subtitle={loading ? "Carregando seus cartões..." : `${cartoes.length} cartões · limite usado x disponível`}
        />
        <BentoGrid>
          {cartoes.map((cartao, i) => (
            <CartaoItem
              key={cartao.id}
              cartao={cartao}
              record={creditRecords[i]}
              delay={i * 90}
              onEdit={(card) => { setManagedCard(card); setDialogMode("edit"); }}
              onDelete={(card) => { setManagedCard(card); setDialogMode("delete"); }}
            />
          ))}
          {!loading && cartoes.length === 0 && benefitRecords.length === 0 && (
            <div className="col-span-12">
              <EmptyState
                icon={CreditCard}
                title="Nenhum cartão cadastrado"
                description="Cadastre seu primeiro cartão para acompanhar limite, vencimento e faturas — é só usar o botão “Adicionar cartão” aqui em cima."
              />
            </div>
          )}
        </BentoGrid>
      </div>

      {benefitRecords.length > 0 && <div>
        <SectionHeader title="Cartões alimentação" subtitle={`${benefitRecords.length} ${benefitRecords.length === 1 ? "cartão" : "cartões"} · compras descontam o saldo automaticamente`} />
        <BentoGrid>{benefitRecords.map((card, index) => <BenefitCardItem key={card.id} record={card} delay={index * 90} onEdit={(item) => { setManagedCard(item); setDialogMode("edit"); }} onDelete={(item) => { setManagedCard(item); setDialogMode("delete"); }} />)}</BentoGrid>
      </div>}

      {/* --- Histórico das faturas --- */}
      <GlassCard variant="liquid">
        {loading ? (
          <div className="grid min-h-55 place-items-center text-sm text-ink-muted" role="status">Carregando calendário de vencimentos...</div>
        ) : (
          <BillCalendar cards={cartoes} />
        )}
      </GlassCard>

      <GlassCard variant="liquid">
        <SectionHeader
          title="Total das faturas mês a mês"
          subtitle="Lançamentos e faturas consolidados dos últimos 12 meses"
          action={
            billHistory.length > 1 ? <TrendBadge value={tendenciaFatura} invert className="shrink-0" /> : undefined
          }
        />
        {loading ? (
          <div className="grid h-70 place-items-center text-sm text-ink-muted" role="status">Carregando histórico de faturas...</div>
        ) : billHistory.length > 0 ? (
          <TrendLineChart
            data={billHistory}
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
        ) : (
          <div className="grid min-h-55 place-items-center rounded-2xl border border-dashed border-[var(--color-line)] px-6 text-center">
            <div>
              <p className="font-medium text-ink">Ainda não há histórico de faturas</p>
              <p className="mt-1 text-sm text-ink-muted">As compras atribuídas a cartões aparecerão aqui, organizadas por mês.</p>
            </div>
          </div>
        )}
      </GlassCard>
      <CardManagementDialog key={`${managedCard?.id ?? "none"}-${dialogMode}`} card={managedCard} mode={dialogMode} onClose={() => setManagedCard(null)} onChanged={refresh} onRaise={setCelebration} />
      <RaiseCelebration visible={celebration !== ""} message={celebration} onClose={() => setCelebration("")} />
    </section>
  );
}
