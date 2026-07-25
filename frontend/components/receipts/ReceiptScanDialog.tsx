"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Camera, Check, LoaderCircle, ScanLine, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { SelectField } from "@/components/forms/SelectField";

const CATEGORIES = ["Alimentação", "Moradia", "Transporte", "Saúde", "Lazer", "Educação", "Assinatura", "Outros"];

interface Extracted {
  amount: number | null;
  date: string | null;
  description: string;
  category: string;
}

/** Reduz a foto no client (canvas) para JPEG menor antes de enviar à IA. */
function fileToDataURL(file: File, maxDim = 1280, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("ctx"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ReceiptScanDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const { toast } = useToast();
  const [preview, setPreview] = useState("");
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [hasResult, setHasResult] = useState(false);

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Outros");
  const [tipo, setTipo] = useState<"expense" | "income">("expense");

  function reset() {
    setPreview("");
    setScanning(false);
    setSaving(false);
    setError("");
    setHasResult(false);
    setAmount("");
    setDate("");
    setDescription("");
    setCategory("Outros");
    setTipo("expense");
  }

  function close() {
    reset();
    onClose();
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setHasResult(false);
    setScanning(true);
    try {
      const dataUrl = await fileToDataURL(file);
      setPreview(dataUrl);
      const res = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      if (res.status === 501) {
        setError("A leitura por foto ainda não está configurada (defina GROQ_API_KEY).");
        return;
      }
      if (res.status === 422) {
        setError("Não consegui ler o comprovante. Tente uma foto mais nítida ou digite manualmente.");
        return;
      }
      if (!res.ok) {
        setError("Falha ao processar a imagem. Tente novamente.");
        return;
      }
      const data = (await res.json()) as Extracted;
      setAmount(data.amount != null ? String(data.amount).replace(".", ",") : "");
      setDate(data.date ?? new Date().toISOString().slice(0, 10));
      setDescription(data.description ?? "");
      setCategory(CATEGORIES.includes(data.category) ? data.category : "Outros");
      setHasResult(true);
    } catch {
      setError("Não foi possível ler a imagem no dispositivo.");
    } finally {
      setScanning(false);
    }
  }

  async function handleSave() {
    const value = Number(amount.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast("Informe um valor válido.", "error");
      return;
    }
    if (!description.trim()) {
      toast("Informe uma descrição.", "error");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    if (!supabase) {
      toast("Supabase não configurado.", "error");
      setSaving(false);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      toast("Sessão expirada.", "error");
      setSaving(false);
      return;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: tipo,
        amount: value,
        occurred_on: date || new Date().toISOString().slice(0, 10),
        description: description.trim(),
        category,
        category_id: null,
        payment_method: "receipt",
        benefit_kind: null,
        recurring: false,
        recurrence_id: null,
        credit_card_id: null,
        origin: tipo === "expense" ? "expense" : "variable_income",
        status: tipo === "expense" ? "paid" : "received",
        idempotency_key: crypto.randomUUID(),
      })
      .select("id")
      .single();

    setSaving(false);
    if (insertError || !inserted) {
      toast("Não foi possível salvar o lançamento.", "error");
      return;
    }
    toast("Lançamento criado a partir da nota.", "success");
    onSaved(inserted.id);
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
            aria-label="Escanear nota ou comprovante"
            className="liquid-glass-hero relative my-auto w-full max-w-lg rounded-[2rem] p-6 sm:p-8"
            initial={reduceMotion ? undefined : { scale: 0.96, opacity: 0 }}
            animate={reduceMotion ? undefined : { scale: 1, opacity: 1 }}
            exit={reduceMotion ? undefined : { scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={close} className="absolute right-5 top-5 rounded-xl p-2 text-ink-muted hover:bg-white/10 hover:text-ink" aria-label="Fechar">
              <X className="size-5" />
            </button>

            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                <ScanLine className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-ink">Escanear nota</h2>
                <p className="text-sm text-ink-soft">Tire ou envie uma foto do comprovante e revise antes de salvar.</p>
              </div>
            </div>

            {!hasResult && (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-line)] p-6 text-center transition-colors hover:border-accent hover:bg-accent/5">
                {scanning ? <LoaderCircle className="size-6 animate-spin text-accent" /> : <Camera className="size-6 text-ink-muted" />}
                <span className="text-sm font-medium text-ink">{scanning ? "Lendo o comprovante…" : "Tirar foto ou escolher imagem"}</span>
                <span className="text-xs text-ink-muted">A imagem é reduzida no seu aparelho antes do envio.</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} disabled={scanning} />
              </label>
            )}

            {error && (
              <div role="alert" className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-warn">{error}</div>
            )}

            {hasResult && (
              <div className="mt-2 flex flex-col gap-3">
                {preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Prévia do comprovante" className="max-h-40 w-full rounded-2xl object-contain" />
                )}
                <div className="grid grid-cols-2 gap-3">
                  <label className="field-label col-span-2">Descrição
                    <input className="field" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Estabelecimento" />
                  </label>
                  <label className="field-label">Valor (R$)
                    <input className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
                  </label>
                  <label className="field-label">Data
                    <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </label>
                  <label className="field-label">Categoria
                    <SelectField value={category} onChange={(e) => setCategory(e.target.value)}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </SelectField>
                  </label>
                  <label className="field-label">Tipo
                    <SelectField value={tipo} onChange={(e) => setTipo(e.target.value as "expense" | "income")}>
                      <option value="expense">Despesa</option>
                      <option value="income">Receita</option>
                    </SelectField>
                  </label>
                </div>
                <div className="mt-1 flex justify-end gap-3">
                  <button type="button" onClick={() => { setHasResult(false); setPreview(""); }} className="rounded-2xl border border-[var(--color-line)] px-4 py-2.5 text-sm font-semibold text-ink-soft hover:text-ink">Outra foto</button>
                  <button type="button" onClick={() => void handleSave()} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60">
                    {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
                    Salvar lançamento
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
