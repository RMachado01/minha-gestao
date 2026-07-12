"use client";

import { useState } from "react";
import { Check, CreditCard, Plus, X } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

export function CardRegistration() {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  return <div>
    <button type="button" onClick={() => setOpen((value) => !value)} className="btn-primary min-h-11">{open ? <X className="size-4" /> : <Plus className="size-4" />}{open ? "Fechar cadastro" : "Cadastrar cartão"}</button>
    {open && <GlassCard strong className="mt-4 p-6"><div className="mb-5"><p className="text-xs font-semibold uppercase tracking-wider text-accent">Novo cartão</p><h3 className="mt-1 text-lg font-semibold text-ink">Dados do cartão de crédito</h3><p className="mt-1 text-sm text-ink-muted">Não informe número completo, CVV ou senha. Apenas dados de controle financeiro.</p></div><form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(event) => { event.preventDefault(); setSaved(true); setTimeout(() => { setSaved(false); setOpen(false); }, 1800); }}><label className="field-label">Apelido<input className="field" name="nickname" placeholder="Ex.: Nubank principal" required /></label><label className="field-label">Bandeira<select className="field" name="brand"><option>Mastercard</option><option>Visa</option><option>Elo</option><option>American Express</option></select></label><label className="field-label">Limite total (R$)<input className="field tnum" type="number" min="0" step="0.01" name="limit" required /></label><label className="field-label">Cor<select className="field" name="color"><option value="#818cf8">Índigo</option><option value="#c084fc">Violeta</option><option value="#22d3ee">Ciano</option><option value="#fb7185">Rosa</option></select></label><label className="field-label">Dia de fechamento<input className="field" type="number" min="1" max="31" name="closing_day" required /></label><label className="field-label">Dia de vencimento<input className="field" type="number" min="1" max="31" name="due_day" required /></label><button className="btn-primary sm:col-span-2 lg:self-end" type="submit">{saved ? <><Check className="size-4" />Cartão cadastrado</> : <><CreditCard className="size-4" />Salvar cartão</>}</button></form></GlassCard>}
  </div>;
}
