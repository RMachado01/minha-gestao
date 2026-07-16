"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Search,
  Filter,
  Receipt,
  Pencil,
  Trash2,
  X,
  Check,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

import { BentoGrid } from "@/components/ui/BentoGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { MoneyInput } from "@/components/forms/MoneyInput";

import type { Transacao } from "@/lib/data/empty";
import { formatBRL } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";

const categoriasList = [
  "Alimentação",
  "Moradia",
  "Transporte",
  "Saúde",
  "Salário",
  "Lazer",
  "Educação",
  "Assinatura",
];

const STATUS_STYLE: Record<string, string> = {
  pago: "bg-emerald-500/15 text-emerald-400",
  recebido: "bg-emerald-500/15 text-emerald-400",
  pendente: "bg-amber-500/15 text-amber-400",
};

const STATUS_LABEL: Record<string, string> = {
  pago: "Pago",
  recebido: "Recebido",
  pendente: "Pendente",
};

const FORMA_LABEL: Record<string, string> = {
  pix: "Pix",
  credit: "Crédito",
  cash: "Dinheiro",
  benefit: "Benefício",
};

interface DbTransaction {
  id: string;
  description: string;
  amount: number | string;
  occurred_on: string;
  type: "income" | "expense" | "benefit";
  category: string;
  status: "pending" | "paid" | "received";
  recurring: boolean;
  payment_method: "pix" | "credit" | "cash" | "benefit" | null;
}

const STATUS_FROM_DB: Record<DbTransaction["status"], Transacao["status"]> = {
  pending: "pendente",
  paid: "pago",
  received: "recebido",
};

const STATUS_TO_DB: Record<Transacao["status"], DbTransaction["status"]> = {
  pendente: "pending",
  pago: "paid",
  recebido: "received",
};

function toTransacao(item: DbTransaction): Transacao {
  return {
    id: item.id,
    descricao: item.description,
    valor: Number(item.amount),
    data: item.occurred_on,
    tipo: item.type,
    categoria: item.category,
    conta: "Conta principal",
    status: STATUS_FROM_DB[item.status],
    recorrente: item.recurring,
    formaPagamento: item.payment_method ?? (item.type === "benefit" ? "benefit" : "pix"),
  };
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function TransacoesPage() {
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const createdId = searchParams.get("created");
  const [lista, setLista] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [tipo, setTipo] = useState<string>("");
  const [categoria, setCategoria] = useState<string>("");
  const [busca, setBusca] = useState<string>("");
  const { toast } = useToast();
  const [editando, setEditando] = useState<Transacao | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function loadTransactions() {
    const supabase = createClient();
    if (!supabase) {
      setLoadError("Supabase não configurado.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError("");
    const { data, error } = await supabase
      .from("transactions")
      .select("id,description,amount,occurred_on,type,category,status,recurring,payment_method")
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      setLoadError("Não foi possível carregar o histórico. Tente novamente.");
    } else {
      setLista(((data ?? []) as DbTransaction[]).map(toTransacao));
    }
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadTransactions(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const categorias = useMemo(
    () => Array.from(new Set(lista.map((t) => t.categoria))).sort(),
    [lista],
  );

  const filtrada = useMemo(() => {
    return lista
      .filter((t) => {
        if (tipo && t.tipo !== tipo) return false;
        if (categoria && t.categoria !== categoria) return false;
        if (busca && !t.descricao.toLowerCase().includes(busca.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [lista, tipo, categoria, busca]);

  const totalEntradas = useMemo(
    () => filtrada.filter((t) => t.tipo === "income").reduce((s, t) => s + t.valor, 0),
    [filtrada],
  );
  const totalSaidas = useMemo(
    () => filtrada.filter((t) => t.tipo === "expense").reduce((s, t) => s + t.valor, 0),
    [filtrada],
  );
  const saldo = totalEntradas - totalSaidas;

  async function handleDelete(id: string) {
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      toast("Não foi possível excluir a transação.", "error");
      return;
    }
    setLista((prev) => prev.filter((t) => t.id !== id));
    setConfirmDelete(null);
    toast("Transação excluída", "warning");
  }

  async function handleSaveEdit(updated: Transacao) {
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.from("transactions").update({
      description: updated.descricao.trim(),
      amount: updated.valor,
      occurred_on: updated.data,
      type: updated.tipo,
      category: updated.categoria,
      status: STATUS_TO_DB[updated.status],
      recurring: updated.recorrente,
      payment_method: updated.formaPagamento,
    }).eq("id", updated.id);
    if (error) {
      toast("Não foi possível atualizar a transação.", "error");
      return;
    }
    setLista((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditando(null);
    toast("Transação atualizada com sucesso!", "success");
  }

  return (
    <section aria-labelledby="transacoes-heading" className="gz-page flex flex-col gap-6">
      <style>{gzKeyframes}</style>

      <h2 id="transacoes-heading" className="sr-only">
        Histórico de transações
      </h2>

      <PageHeader
        eyebrow="Finanças"
        title="Transações"
        description="Navegue pelo histórico completo de entradas e saídas. Clique no lápis para editar ou corrigir um lançamento."
      />

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-neg">
          <span>{loadError}</span>
          <button type="button" onClick={() => void loadTransactions()} className="inline-flex items-center gap-2 font-semibold"><RefreshCw className="size-4" />Tentar novamente</button>
        </div>
      )}

      {/* Filter bar */}
      <div className="gz-rise flex flex-wrap items-center gap-3" style={{ animationDelay: "0ms" }}>
        <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] px-3 py-1.5 text-sm">
          <Filter className="h-3.5 w-3.5 text-ink-muted" strokeWidth={2} />
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="bg-transparent text-ink outline-none"
            aria-label="Filtrar por tipo"
          >
            <option value="">Todas</option>
            <option value="income">Entradas</option>
            <option value="expense">Saídas</option>
            <option value="benefit">VR / VA</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] px-3 py-1.5 text-sm">
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="bg-transparent text-ink outline-none"
            aria-label="Filtrar por categoria"
          >
            <option value="">Categoria</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-1 items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-card)] px-3 py-1.5 text-sm sm:max-w-xs">
          <Search className="h-3.5 w-3.5 shrink-0 text-ink-muted" strokeWidth={2} />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar transação..."
            className="w-full bg-transparent text-ink placeholder:text-ink-muted outline-none"
            aria-label="Buscar transação"
          />
        </div>
      </div>

      {/* KPIs */}
      <BentoGrid>
        <KpiCard
          className="gz-rise col-span-6 sm:col-span-3"
          style={{ animationDelay: "60ms" }}
          label="Transações"
          value={String(filtrada.length)}
          tone="neutral"
          icon={<Receipt className="h-4 w-4" strokeWidth={2} />}
          hint="no período filtrado"
        />
        <KpiCard
          className="gz-rise col-span-6 sm:col-span-3"
          style={{ animationDelay: "120ms" }}
          label="Total entradas"
          value={formatBRL(totalEntradas)}
          tone="pos"
          icon={<ArrowUpCircle className="h-4 w-4" strokeWidth={2} />}
          hint="receitas do período"
        />
        <KpiCard
          className="gz-rise col-span-6 sm:col-span-3"
          style={{ animationDelay: "180ms" }}
          label="Total saídas"
          value={formatBRL(totalSaidas)}
          tone="neg"
          icon={<ArrowDownCircle className="h-4 w-4" strokeWidth={2} />}
          hint="despesas do período"
        />
        <KpiCard
          className="gz-rise col-span-6 sm:col-span-3"
          style={{ animationDelay: "240ms" }}
          label="Saldo do período"
          value={formatBRL(saldo)}
          tone={saldo >= 0 ? "pos" : "neg"}
          icon={<ArrowUpCircle className="h-4 w-4" strokeWidth={2} />}
          hint="entradas − saídas"
        />
      </BentoGrid>

      {/* Table */}
      <GlassCard
        variant="liquid"
        className="gz-rise col-span-12"
        style={{ animationDelay: "300ms" }}
      >
        <div className="-mx-2 overflow-x-auto px-2">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <caption className="sr-only">
              Lista de transações com ações de editar e excluir.
            </caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Data</th>
                <th scope="col" className="py-2 px-3 font-medium">Descrição</th>
                <th scope="col" className="py-2 px-3 font-medium">Categoria</th>
                <th scope="col" className="py-2 px-3 text-right font-medium">Valor</th>
                <th scope="col" className="py-2 px-3 text-center font-medium">Status</th>
                <th scope="col" className="py-2 px-3 text-right font-medium">Pagamento</th>
                <th scope="col" className="py-2 pl-3 text-center font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrada.map((t, index) => (
                <motion.tr
                  key={t.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduceMotion ? 0 : Math.min(index * 0.025, 0.3), duration: reduceMotion ? 0.01 : 0.28 }}
                  className={`group border-t border-[var(--color-line)] transition-colors hover:bg-white/[0.03] ${createdId === t.id ? "bg-emerald-400/10" : ""}`}
                >
                  <td className="tnum py-3 pr-3 text-ink-soft">{formatDate(t.data)}</td>
                  <td className="py-3 px-3 font-medium text-ink">{t.descricao}</td>
                  <td className="py-3 px-3 text-ink-soft">{t.categoria}</td>
                  <td
                    className={`tnum py-3 px-3 text-right font-semibold ${
                      t.tipo === "income" ? "text-pos" : t.tipo === "benefit" ? "text-warn" : "text-neg"
                    }`}
                  >
                    {t.tipo === "expense" ? "−" : "+"} {formatBRL(t.valor)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[t.status]}`}
                    >
                      {STATUS_LABEL[t.status]}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-ink-soft">
                    {FORMA_LABEL[t.formaPagamento]}
                  </td>
                  <td className="py-3 pl-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditando({ ...t })}
                        className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-accent/10 hover:text-accent"
                        aria-label={`Editar ${t.descricao}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {confirmDelete === t.id ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(t.id)}
                          className="rounded-lg p-1.5 text-neg transition-colors hover:bg-red-500/10"
                          aria-label="Confirmar exclusão"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(t.id)}
                          className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-red-500/10 hover:text-neg"
                          aria-label={`Excluir ${t.descricao}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
              {loading && (
                <tr><td colSpan={7} className="py-12 text-center text-ink-muted"><LoaderCircle className="mx-auto mb-2 size-5 animate-spin text-accent" />Carregando seu histórico...</td></tr>
              )}
              {!loading && filtrada.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-muted">
                    Nenhuma transação encontrada com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Edit panel */}
      {editando && (
        <EditPanel
          transacao={editando}
          onSave={handleSaveEdit}
          onCancel={() => setEditando(null)}
        />
      )}
    </section>
  );
}

/* ─── Edit Panel ─── */

function EditPanel({
  transacao,
  onSave,
  onCancel,
}: {
  transacao: Transacao;
  onSave: (t: Transacao) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Transacao>(transacao);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden
      />

      {/* Panel */}
      <aside data-lenis-prevent className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-[var(--color-line)] bg-[var(--color-bg)] p-6 shadow-2xl sm:p-7">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-accent">
              Editar lançamento
            </p>
            <h3 className="mt-1 text-lg font-semibold text-ink">
              {transacao.descricao}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl p-2 text-ink-muted transition-colors hover:bg-white/10 hover:text-ink"
            aria-label="Fechar editor"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5">
          <label className="field-label">
            Descrição
            <input
              className="field"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              required
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="field-label">
              Tipo
              <select
                className="field"
                value={form.tipo}
                onChange={(e) =>
                  setForm({ ...form, tipo: e.target.value as Transacao["tipo"] })
                }
              >
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
                <option value="benefit">VR / VA</option>
              </select>
            </label>

            <label className="field-label">
              Status
              <select
                className="field"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as Transacao["status"] })
                }
              >
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="recebido">Recebido</option>
              </select>
            </label>
          </div>

          <label className="field-label">
            Valor
            <MoneyInput
              value={form.valor || ""}
              onChange={(e) =>
                setForm({ ...form, valor: Number(e.target.value) || 0 })
              }
              required
            />
          </label>

          <label className="field-label">
            Data
            <input
              className="field"
              type="date"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
              required
            />
          </label>

          <label className="field-label">
            Categoria
            <select
              className="field"
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            >
              {categoriasList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Forma de pagamento
            <select
              className="field"
              value={form.formaPagamento}
              onChange={(e) =>
                setForm({
                  ...form,
                  formaPagamento: e.target.value as Transacao["formaPagamento"],
                })
              }
            >
              <option value="pix">Pix</option>
              <option value="credit">Cartão de crédito</option>
              <option value="cash">Dinheiro</option>
              <option value="benefit">VR / VA</option>
            </select>
          </label>

          <label className="ios-glass flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={form.recorrente}
              onChange={(e) => setForm({ ...form, recorrente: e.target.checked })}
              className="size-4"
            />
            <span>
              <strong className="block font-semibold text-ink">Recorrente</strong>
              <span className="text-xs text-ink-muted">
                Este lançamento se repete mensalmente.
              </span>
            </span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {saved ? (
                <>
                  <Check className="size-4" /> Salvo
                </>
              ) : (
                <>
                  <Check className="size-4" /> Salvar alterações
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-[var(--color-line)] px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-white/5 hover:text-ink"
            >
              Cancelar
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

/* ─── Animation ─── */

const gzKeyframes = `
@keyframes gzRise {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.gz-rise {
  animation: gzRise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
`;
