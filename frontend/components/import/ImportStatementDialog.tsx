"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, FileUp, LoaderCircle, Upload, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { SelectField } from "@/components/forms/SelectField";
import { formatBRL, formatDateBR } from "@/lib/format";
import { parseStatement, importKey, type ImportedTx } from "@/lib/import/statement";

interface Row extends ImportedTx {
  include: boolean;
}

const CATEGORIES = [
  "Importado",
  "Alimentação",
  "Moradia",
  "Transporte",
  "Saúde",
  "Lazer",
  "Educação",
  "Assinatura",
  "Salário",
  "Rendimentos",
  "Outros",
];

export function ImportStatementDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: (inserted: number) => void;
}) {
  const reduceMotion = useReducedMotion();
  const { toast } = useToast();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [category, setCategory] = useState("Importado");

  function reset() {
    setFileName("");
    setRows([]);
    setWarnings([]);
    setCategory("Importado");
  }

  function close() {
    reset();
    onClose();
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setFileName(file.name);
    try {
      const content = await file.text();
      const result = parseStatement(file.name, content);
      setRows(result.items.map((item) => ({ ...item, include: true })));
      setWarnings(result.warnings);
    } catch {
      setRows([]);
      setWarnings(["Não foi possível ler o arquivo. Verifique se é um .ofx ou .csv válido."]);
    } finally {
      setParsing(false);
      event.target.value = "";
    }
  }

  function toggleType(index: number) {
    setRows((current) =>
      current.map((r, i) => (i === index ? { ...r, type: r.type === "expense" ? "income" : "expense" } : r)),
    );
  }

  function toggleInclude(index: number) {
    setRows((current) => current.map((r, i) => (i === index ? { ...r, include: !r.include } : r)));
  }

  const selected = rows.filter((r) => r.include);
  const entradas = selected.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const saidas = selected.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);

  async function handleImport() {
    if (selected.length === 0) return;
    setImporting(true);
    const supabase = createClient();
    if (!supabase) {
      toast("Supabase não configurado.", "error");
      setImporting(false);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      toast("Sessão expirada. Faça login novamente.", "error");
      setImporting(false);
      return;
    }

    // Dedupe interna por chave, evitando conflito na mesma requisição.
    const byKey = new Map<string, ImportedTx>();
    for (const tx of selected) byKey.set(importKey(tx), tx);

    const payload = Array.from(byKey.entries()).map(([key, tx]) => ({
      user_id: userId,
      type: tx.type,
      amount: tx.amount,
      occurred_on: tx.date,
      description: tx.description,
      category,
      category_id: null,
      payment_method: "import",
      benefit_kind: null,
      recurring: false,
      recurrence_id: null,
      credit_card_id: null,
      origin: tx.type === "expense" ? "expense" : "variable_income",
      status: tx.type === "expense" ? "paid" : "received",
      idempotency_key: key,
    }));

    const { data, error } = await supabase
      .from("transactions")
      .upsert(payload, { onConflict: "user_id,idempotency_key", ignoreDuplicates: true })
      .select("id");

    setImporting(false);

    if (error) {
      toast("Não foi possível importar. Tente novamente.", "error");
      return;
    }

    const inserted = data?.length ?? 0;
    const skipped = payload.length - inserted;
    toast(
      skipped > 0
        ? `${inserted} transação(ões) importada(s) · ${skipped} já existia(m).`
        : `${inserted} transação(ões) importada(s).`,
      "success",
    );
    onImported(inserted);
    close();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Importar extrato bancário"
            className="liquid-glass-hero relative my-auto w-full max-w-2xl rounded-[2rem] p-6 sm:p-8"
            initial={reduceMotion ? undefined : { scale: 0.96, opacity: 0 }}
            animate={reduceMotion ? undefined : { scale: 1, opacity: 1 }}
            exit={reduceMotion ? undefined : { scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              className="absolute right-5 top-5 rounded-xl p-2 text-ink-muted hover:bg-white/10 hover:text-ink"
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>

            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                <FileUp className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-ink">Importar extrato</h2>
                <p className="text-sm text-ink-soft">Envie um arquivo .ofx ou .csv exportado do seu banco.</p>
              </div>
            </div>

            {/* Upload */}
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-line)] p-6 text-center transition-colors hover:border-accent hover:bg-accent/5">
              <Upload className="size-6 text-ink-muted" />
              <span className="text-sm font-medium text-ink">
                {parsing ? "Lendo arquivo…" : fileName || "Clique para escolher o arquivo"}
              </span>
              <span className="text-xs text-ink-muted">Formatos: OFX, QFX ou CSV</span>
              <input type="file" accept=".ofx,.qfx,.csv,.txt" className="hidden" onChange={handleFile} />
            </label>

            {warnings.length > 0 && (
              <div role="alert" className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-warn">
                {warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            )}

            {rows.length > 0 && (
              <>
                {/* Resumo + categoria */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-4 text-sm">
                    <span className="text-ink-soft">{selected.length} selecionada(s)</span>
                    <span className="text-pos">+ {formatBRL(entradas)}</span>
                    <span className="text-neg">- {formatBRL(saidas)}</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-ink-soft">
                    Categoria
                    <SelectField value={category} onChange={(e) => setCategory(e.target.value)} className="min-w-40">
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </SelectField>
                  </label>
                </div>

                {/* Preview */}
                <div className="mt-3 max-h-72 overflow-y-auto rounded-2xl border border-[var(--color-line)]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[var(--color-surface-card)] text-xs text-ink-muted">
                      <tr>
                        <th className="w-8 p-2"></th>
                        <th className="p-2 text-left font-medium">Data</th>
                        <th className="p-2 text-left font-medium">Descrição</th>
                        <th className="p-2 text-center font-medium">Tipo</th>
                        <th className="p-2 text-right font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className={`border-t border-[var(--color-line)] ${r.include ? "" : "opacity-40"}`}>
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              className="size-4"
                              checked={r.include}
                              onChange={() => toggleInclude(i)}
                              aria-label={`Incluir ${r.description}`}
                            />
                          </td>
                          <td className="whitespace-nowrap p-2 text-ink-soft">{formatDateBR(r.date)}</td>
                          <td className="max-w-[16rem] truncate p-2 text-ink" title={r.description}>{r.description}</td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => toggleType(i)}
                              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${r.type === "income" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}
                              title="Clique para alternar entrada/saída"
                            >
                              {r.type === "income" ? <ArrowUpCircle className="size-3" /> : <ArrowDownCircle className="size-3" />}
                              {r.type === "income" ? "Entrada" : "Saída"}
                            </button>
                          </td>
                          <td className={`tnum whitespace-nowrap p-2 text-right ${r.type === "income" ? "text-pos" : "text-ink"}`}>
                            {formatBRL(r.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-2xl border border-[var(--color-line)] px-4 py-2.5 text-sm font-semibold text-ink-soft hover:text-ink"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleImport()}
                    disabled={importing || selected.length === 0}
                    className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                  >
                    {importing ? <LoaderCircle className="size-4 animate-spin" /> : <FileUp className="size-4" />}
                    Importar {selected.length} transação(ões)
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
