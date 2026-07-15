"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Check, CreditCard, LoaderCircle, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { CreditCardRecord } from "@/lib/supabase/useCreditCards";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

type DialogMode = "edit" | "delete";

export function CardManagementDialog({
  card,
  mode,
  onClose,
  onChanged,
}: {
  card: CreditCardRecord | null;
  mode: DialogMode;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function updateCard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!card) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);
    setError("");
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setSaving(false);
      return;
    }
    const { error: updateError } = await supabase.from("credit_cards").update({
      nickname: String(data.get("nickname")).trim(),
      brand: String(data.get("brand")),
      total_limit: Number(data.get("limit")),
      color: String(data.get("color")),
      closing_day: Number(data.get("closing_day")),
      due_day: Number(data.get("due_day")),
    }).eq("id", card.id);
    if (updateError) {
      setError("Não foi possível atualizar o cartão.");
      setSaving(false);
      return;
    }
    await onChanged();
    toast("Cartão atualizado com sucesso.", "success");
    setSaving(false);
    onClose();
  }

  async function archiveCard() {
    if (!card) return;
    setSaving(true);
    setError("");
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      setSaving(false);
      return;
    }
    const { error: deleteError } = await supabase
      .from("credit_cards")
      .update({ active: false })
      .eq("id", card.id);
    if (deleteError) {
      setError("Não foi possível excluir o cartão.");
      setSaving(false);
      return;
    }
    await onChanged();
    toast("Cartão removido. O histórico foi preservado.", "warning");
    setSaving(false);
    onClose();
  }

  return (
    <AnimatePresence>
      {card && (
        <motion.div
          className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="card-dialog-title"
            className="liquid-glass-hero relative my-auto w-full max-w-2xl rounded-[2rem] p-6 sm:p-8"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
          >
            <button type="button" onClick={onClose} className="absolute right-5 top-5 rounded-xl p-2 text-ink-muted hover:bg-white/10 hover:text-ink" aria-label="Fechar"><X className="size-5" /></button>
            <div className="flex items-center gap-3 pr-12">
              <span className={`grid size-11 place-items-center rounded-2xl ${mode === "delete" ? "bg-rose-400/10 text-neg" : "bg-accent/10 text-accent"}`}>
                {mode === "delete" ? <Trash2 className="size-5" /> : <CreditCard className="size-5" />}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-accent">Gerenciar cartão</p>
                <h2 id="card-dialog-title" className="mt-1 text-xl font-semibold text-ink">{mode === "delete" ? `Excluir ${card.nickname}?` : `Editar ${card.nickname}`}</h2>
              </div>
            </div>

            {mode === "delete" ? (
              <div className="mt-6">
                <div className="flex gap-3 rounded-2xl bg-amber-400/10 p-4 text-sm leading-relaxed text-ink-soft"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn" /><p>O cartão deixará de aparecer na lista e em novos lançamentos. Compras, faturas e vínculos anteriores serão preservados no histórico.</p></div>
                {error && <p role="alert" className="mt-4 rounded-xl bg-rose-400/10 p-3 text-sm text-neg">{error}</p>}
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button type="button" onClick={onClose} className="rounded-2xl border border-[var(--color-line)] px-4 py-2.5 text-sm font-semibold text-ink-soft hover:text-ink">Cancelar</button>
                  <button type="button" onClick={() => void archiveCard()} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}Excluir cartão</button>
                </div>
              </div>
            ) : (
              <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={updateCard}>
                <label className="field-label">Apelido<input className="field" name="nickname" defaultValue={card.nickname} minLength={2} required /></label>
                <label className="field-label">Bandeira<select className="field" name="brand" defaultValue={card.brand}><option>Mastercard</option><option>Visa</option><option>Elo</option><option>American Express</option></select></label>
                <label className="field-label">Limite total (R$)<input className="field tnum" type="number" min="0" step="0.01" name="limit" defaultValue={card.total_limit} required /></label>
                <label className="field-label">Cor<select className="field" name="color" defaultValue={card.color ?? "#006b3f"}><option value="#006b3f">Verde escuro</option><option value="#00a86b">Verde claro</option><option value="#34d399">Esmeralda</option><option value="#60a5fa">Azul</option><option value="#818cf8">Índigo</option><option value="#a78bfa">Violeta</option></select></label>
                <label className="field-label">Dia de fechamento<input className="field" type="number" min="1" max="31" name="closing_day" defaultValue={card.closing_day} required /></label>
                <label className="field-label">Dia de vencimento<input className="field" type="number" min="1" max="31" name="due_day" defaultValue={card.due_day} required /></label>
                {error && <p role="alert" className="rounded-xl bg-rose-400/10 p-3 text-sm text-neg sm:col-span-2">{error}</p>}
                <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
                  <button type="button" onClick={onClose} className="rounded-2xl border border-[var(--color-line)] px-4 py-2.5 text-sm font-semibold text-ink-soft hover:text-ink">Cancelar</button>
                  <button className="btn-primary" type="submit" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}Salvar alterações</button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
