"use client";

import { useMemo, useState } from "react";
import { Target, Bell, Plus, Trash2, TriangleAlert, Wallet, LoaderCircle, Database } from "lucide-react";

import { BentoGrid } from "@/components/ui/BentoGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { SelectField } from "@/components/forms/SelectField";
import { useToast } from "@/components/ui/Toast";

import { useFinanceSummary } from "@/lib/supabase/useFinanceSummary";
import { usePlans } from "@/lib/supabase/usePlans";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/cn";

const ALERT_SCOPE_TOTAL = "__total__";

export default function PlanosPage() {
  const { loading: summaryLoading, gastosPorCategoria, gastosTotal } = useFinanceSummary();
  const plans = usePlans();
  const { toast } = useToast();

  // Gasto realizado por categoria no mês corrente (derivado das transações).
  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of gastosPorCategoria) map.set(c.name, c.value);
    return map;
  }, [gastosPorCategoria]);

  const totalOrcado = plans.budgets.reduce((s, b) => s + b.limit_amount, 0);
  const usoOrcamento = totalOrcado > 0 ? gastosTotal / totalOrcado : 0;
  const alertasDisparados = plans.alerts.filter((a) => {
    if (!a.active) return false;
    const atual = a.category === null ? gastosTotal : spentByCategory.get(a.category) ?? 0;
    return atual >= a.threshold_amount;
  }).length;

  const loading = summaryLoading || plans.loading;

  return (
    <section className="gz-page flex flex-col gap-6">
      <PageHeader
        eyebrow="Finanças"
        title="Planos"
        description="Defina tetos de gasto por categoria e crie alertas personalizados. Os valores gastos são calculados automaticamente a partir dos seus lançamentos do mês."
      />

      {!plans.ready && !plans.loading ? (
        <GlassCard variant="liquid" className="flex items-start gap-3">
          <Database className="mt-0.5 size-5 shrink-0 text-accent" />
          <div className="text-sm text-ink-soft">
            <p className="font-medium text-ink">Recurso pronto — falta aplicar a migração do banco.</p>
            <p className="mt-1">
              Rode a migração <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs">20260722000001_custom_plans.sql</code> no Supabase
              (cria as tabelas <code className="text-xs">category_budgets</code> e <code className="text-xs">spending_alerts</code>) para começar a usar os planos.
            </p>
          </div>
        </GlassCard>
      ) : (
        <>
          {/* KPIs */}
          <BentoGrid>
            <KpiCard
              className="col-span-12 sm:col-span-6 lg:col-span-3"
              label="Total orçado"
              value={formatBRL(totalOrcado)}
              tone="neutral"
              icon={<Target className="h-4 w-4" strokeWidth={2} />}
            />
            <KpiCard
              className="col-span-12 sm:col-span-6 lg:col-span-3"
              label="Gasto no mês"
              value={formatBRL(gastosTotal)}
              tone={usoOrcamento >= 1 ? "neg" : "neutral"}
              icon={<Wallet className="h-4 w-4" strokeWidth={2} />}
            />
            <KpiCard
              className="col-span-12 sm:col-span-6 lg:col-span-3"
              label="Uso do orçamento"
              value={totalOrcado > 0 ? `${Math.round(usoOrcamento * 100)}%` : "—"}
              tone={usoOrcamento >= 1 ? "neg" : usoOrcamento >= 0.8 ? "neutral" : "pos"}
              hint={totalOrcado > 0 ? undefined : "Defina tetos abaixo"}
              icon={<Target className="h-4 w-4" strokeWidth={2} />}
            />
            <KpiCard
              className="col-span-12 sm:col-span-6 lg:col-span-3"
              label="Alertas disparados"
              value={String(alertasDisparados)}
              tone={alertasDisparados > 0 ? "neg" : "pos"}
              icon={<Bell className="h-4 w-4" strokeWidth={2} />}
            />
          </BentoGrid>

          {loading ? (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <LoaderCircle className="size-4 animate-spin" />
              Carregando seus planos...
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <OrcamentosCard plans={plans} spentByCategory={spentByCategory} categorias={gastosPorCategoria.map((c) => c.name)} toast={toast} />
              <AlertasCard plans={plans} spentByCategory={spentByCategory} gastosTotal={gastosTotal} categorias={gastosPorCategoria.map((c) => c.name)} toast={toast} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ─────────────────────────  Orçamentos por categoria  ───────────────────────── */

function OrcamentosCard({
  plans,
  spentByCategory,
  categorias,
  toast,
}: {
  plans: ReturnType<typeof usePlans>;
  spentByCategory: Map<string, number>;
  categorias: string[];
  toast: (m: string, t?: "success" | "error" | "info") => void;
}) {
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [saving, setSaving] = useState(false);

  const usadas = new Set(plans.budgets.map((b) => b.category));
  const disponiveis = categorias.filter((c) => !usadas.has(c));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(limit.replace(",", "."));
    const cat = category.trim();
    if (!cat || !Number.isFinite(value) || value <= 0) {
      toast("Informe uma categoria e um teto válido.", "error");
      return;
    }
    setSaving(true);
    const { error } = await plans.saveBudget(cat, value);
    setSaving(false);
    if (error) return toast(error, "error");
    toast("Teto salvo.", "success");
    setCategory("");
    setLimit("");
  }

  return (
    <GlassCard variant="liquid" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Target className="size-4 text-accent" />
        <h2 className="text-sm font-semibold text-ink">Orçamentos por categoria</h2>
      </div>

      <div className="flex flex-col gap-3">
        {plans.budgets.length === 0 && (
          <p className="text-sm text-ink-muted">Nenhum teto definido ainda. Crie o primeiro abaixo.</p>
        )}
        {plans.budgets.map((b) => {
          const spent = spentByCategory.get(b.category) ?? 0;
          const ratio = b.limit_amount > 0 ? spent / b.limit_amount : 0;
          const pct = Math.min(100, Math.round(ratio * 100));
          const tone = ratio >= 1 ? "var(--color-neg)" : ratio >= 0.8 ? "var(--color-warn)" : "var(--color-pos)";
          const restante = b.limit_amount - spent;
          return (
            <div key={b.id} className="rounded-2xl border border-[var(--color-line)] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-ink">{b.category}</span>
                <div className="flex items-center gap-2">
                  <span className="tnum text-xs text-ink-soft">
                    {formatBRL(spent)} <span className="text-ink-muted">/ {formatBRL(b.limit_amount)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      const { error } = await plans.deleteBudget(b.id);
                      toast(error || "Teto removido.", error ? "error" : "success");
                    }}
                    className="grid size-7 shrink-0 place-items-center rounded-lg border border-[var(--color-line)] text-ink-muted hover:text-neg"
                    aria-label={`Remover teto de ${b.category}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: tone }} />
              </div>
              <p className="mt-1.5 text-[11px] text-ink-muted">
                {restante >= 0 ? `Restam ${formatBRL(restante)} neste mês` : `Estourou em ${formatBRL(-restante)}`}
              </p>
            </div>
          );
        })}
      </div>

      {/* Novo teto */}
      <form onSubmit={handleSave} className="flex flex-col gap-2.5 rounded-2xl border border-dashed border-[var(--color-line)] p-3.5">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <label className="field-label">
            Categoria
            {disponiveis.length > 0 ? (
              <SelectField value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Selecione…</option>
                {disponiveis.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="__custom__">Outra…</option>
              </SelectField>
            ) : (
              <input className="field" placeholder="Ex.: Alimentação" value={category === "__custom__" ? "" : category} onChange={(e) => setCategory(e.target.value)} />
            )}
          </label>
          <label className="field-label">
            Teto mensal (R$)
            <input className="field" inputMode="decimal" placeholder="0,00" value={limit} onChange={(e) => setLimit(e.target.value)} />
          </label>
        </div>
        {category === "__custom__" && (
          <input className="field" placeholder="Nome da categoria" onChange={(e) => setCategory(e.target.value)} autoFocus />
        )}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
        >
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Salvar teto
        </button>
      </form>
    </GlassCard>
  );
}

/* ─────────────────────────────  Alertas  ───────────────────────────── */

function AlertasCard({
  plans,
  spentByCategory,
  gastosTotal,
  categorias,
  toast,
}: {
  plans: ReturnType<typeof usePlans>;
  spentByCategory: Map<string, number>;
  gastosTotal: number;
  categorias: string[];
  toast: (m: string, t?: "success" | "error" | "info") => void;
}) {
  const [name, setName] = useState("");
  const [scope, setScope] = useState(ALERT_SCOPE_TOTAL);
  const [threshold, setThreshold] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(threshold.replace(",", "."));
    if (!name.trim() || !Number.isFinite(value) || value <= 0) {
      toast("Informe um nome e um limite válido.", "error");
      return;
    }
    setSaving(true);
    const category = scope === ALERT_SCOPE_TOTAL ? null : scope;
    const { error } = await plans.addAlert(name.trim(), category, value);
    setSaving(false);
    if (error) return toast(error, "error");
    toast("Alerta criado.", "success");
    setName("");
    setThreshold("");
    setScope(ALERT_SCOPE_TOTAL);
  }

  return (
    <GlassCard variant="liquid" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Bell className="size-4 text-accent" />
        <h2 className="text-sm font-semibold text-ink">Alertas personalizados</h2>
      </div>

      <div className="flex flex-col gap-3">
        {plans.alerts.length === 0 && (
          <p className="text-sm text-ink-muted">Crie alertas como “Delivery acima de R$ 300” ou “Gasto total acima de R$ 4.000”.</p>
        )}
        {plans.alerts.map((a) => {
          const atual = a.category === null ? gastosTotal : spentByCategory.get(a.category) ?? 0;
          const triggered = a.active && atual >= a.threshold_amount;
          return (
            <div
              key={a.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-colors",
                triggered ? "border-[color-mix(in_oklab,var(--color-neg)_40%,transparent)] bg-[color-mix(in_oklab,var(--color-neg)_8%,transparent)]" : "border-[var(--color-line)]",
                !a.active && "opacity-50",
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-ink">{a.name}</p>
                  {triggered && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[color-mix(in_oklab,var(--color-neg)_18%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold text-neg">
                      <TriangleAlert className="size-3" /> disparado
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-ink-muted">
                  {a.category ?? "Gasto total"} · limite {formatBRL(a.threshold_amount)} · atual <span className="tnum">{formatBRL(atual)}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const { error } = await plans.toggleAlert(a.id, !a.active);
                    if (error) toast(error, "error");
                  }}
                  className="rounded-lg border border-[var(--color-line)] px-2.5 py-1 text-[11px] font-medium text-ink-soft hover:text-ink"
                >
                  {a.active ? "Pausar" : "Ativar"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const { error } = await plans.deleteAlert(a.id);
                    toast(error || "Alerta removido.", error ? "error" : "success");
                  }}
                  className="grid size-7 place-items-center rounded-lg border border-[var(--color-line)] text-ink-muted hover:text-neg"
                  aria-label={`Remover alerta ${a.name}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Novo alerta */}
      <form onSubmit={handleAdd} className="flex flex-col gap-2.5 rounded-2xl border border-dashed border-[var(--color-line)] p-3.5">
        <label className="field-label">
          Nome do alerta
          <input className="field" placeholder="Ex.: Delivery no limite" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <label className="field-label">
            Aplica-se a
            <SelectField value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value={ALERT_SCOPE_TOTAL}>Gasto total do mês</option>
              {categorias.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </SelectField>
          </label>
          <label className="field-label">
            Limite (R$)
            <input className="field" inputMode="decimal" placeholder="0,00" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
        >
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Criar alerta
        </button>
      </form>
    </GlassCard>
  );
}
