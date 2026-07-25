"use client";

import { useState } from "react";
import { Check, Copy, LogOut, RefreshCw, UsersRound } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useJointAccount } from "@/lib/supabase/useJointAccount";

const ROLE_LABEL: Record<string, string> = {
  owner: "Dono",
  manager: "Gestor",
  member: "Membro",
  viewer: "Convidado",
};

export function JointAccountSettings() {
  const { state, loading, error, generateInvite, joinByCode, leave } = useJointAccount();
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinFeedback, setJoinFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const inHousehold = Boolean(state.householdId);

  async function handleGenerate() {
    setGenerating(true);
    await generateInvite();
    setGenerating(false);
  }

  async function handleCopy() {
    if (!state.joinCode) return;
    try {
      await navigator.clipboard.writeText(state.joinCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard pode estar bloqueado; o código continua visível para cópia manual.
    }
  }

  async function handleJoin() {
    setJoining(true);
    setJoinFeedback(null);
    const result = await joinByCode(joinCode);
    setJoinFeedback(result);
    if (result.ok) setJoinCode("");
    setJoining(false);
  }

  async function handleLeave() {
    setLeaving(true);
    await leave();
    setLeaving(false);
    setConfirmLeave(false);
  }

  const expiresLabel = state.joinCodeExpiresAt
    ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
        new Date(state.joinCodeExpiresAt),
      )
    : null;

  return (
    <GlassCard variant="liquid" className="col-span-12">
      <div className="flex items-center gap-3">
        <UsersRound className="size-5 text-accent" />
        <div>
          <h3 className="font-semibold text-ink">Conta conjunta</h3>
          <p className="text-sm text-ink-muted">
            Compartilhe gastos, cartões, metas e investimentos com outra pessoa
          </p>
        </div>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-ink-muted">Carregando...</p>
      ) : inHousehold ? (
        /* ---------- Já faz parte de uma conta conjunta ---------- */
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-pos">
              Ativa
            </span>
            <p className="text-sm text-ink-soft">
              {state.members.length === 1
                ? "Você é a única pessoa nesta conta."
                : `${state.members.length} pessoas compartilhando esta conta.`}
            </p>
          </div>

          {/* Membros */}
          <ul className="flex flex-wrap gap-2">
            {state.members.map((member) => (
              <li
                key={member.user_id}
                className="rounded-2xl border border-[var(--color-line)] px-3 py-1.5 text-sm text-ink-soft"
              >
                {member.isSelf ? "Você" : "Pessoa"}
                <span className="ml-1.5 text-xs text-ink-muted">
                  {ROLE_LABEL[member.role] ?? member.role}
                </span>
              </li>
            ))}
          </ul>

          {/* Código de convite (apenas dono) */}
          {state.isOwner && (
            <div className="rounded-2xl border border-dashed border-[var(--color-line)] p-4">
              <p className="text-sm font-medium text-ink">Código de convite</p>
              {state.joinCode ? (
                <>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 rounded-xl bg-[color-mix(in_oklab,var(--color-accent)_12%,transparent)] px-3 py-2 text-center font-mono text-lg font-bold tracking-[0.3em] text-accent">
                      {state.joinCode}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--color-line)] text-ink-soft transition-colors hover:text-ink"
                      aria-label="Copiar código"
                    >
                      {copied ? <Check className="size-5 text-pos" /> : <Copy className="size-5" />}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-ink-muted">
                    Compartilhe este código com quem você quer adicionar.
                    {expiresLabel && ` Expira em ${expiresLabel}.`}
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline disabled:opacity-50"
                  >
                    <RefreshCw className={`size-4 ${generating ? "animate-spin" : ""}`} />
                    Gerar novo código
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="btn-primary mt-3"
                >
                  {generating ? "Gerando..." : "Gerar código de convite"}
                </button>
              )}
            </div>
          )}

          {/* Sair */}
          {!confirmLeave ? (
            <button
              type="button"
              onClick={() => setConfirmLeave(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/30 px-4 py-2.5 text-sm font-medium text-neg transition-colors hover:bg-rose-400/10"
            >
              <LogOut className="size-4" />
              Sair da conta conjunta
            </button>
          ) : (
            <div className="rounded-2xl bg-rose-400/10 p-4">
              <p className="text-sm text-ink-soft">
                Ao sair, seus dados deixam de ser compartilhados e voltam a ser só
                seus. Os dados criados pela outra pessoa continuam com ela.
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={handleLeave}
                  disabled={leaving}
                  className="rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:opacity-50"
                >
                  {leaving ? "Saindo..." : "Confirmar saída"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmLeave(false)}
                  className="rounded-2xl px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ---------- Ainda não faz parte de nenhuma conta conjunta ---------- */
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {/* Criar / convidar */}
          <div className="rounded-2xl border border-dashed border-[var(--color-line)] p-5">
            <p className="text-sm font-medium text-ink">Convidar alguém</p>
            <p className="mt-1 text-sm text-ink-muted">
              Gere um código e compartilhe. Quem usar o código passará a ver e
              somar os mesmos dados que você.
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="btn-primary mt-4"
            >
              {generating ? "Gerando..." : "Gerar código de convite"}
            </button>
          </div>

          {/* Ingressar */}
          <div className="rounded-2xl border border-dashed border-[var(--color-line)] p-5">
            <p className="text-sm font-medium text-ink">Ingressar em uma conta conjunta</p>
            <p className="mt-1 text-sm text-ink-muted">
              Recebeu um código? Digite abaixo para compartilhar os dados.
            </p>
            <div className="mt-4 flex gap-2">
              <input
                className="field flex-1 text-center font-mono tracking-[0.2em] uppercase"
                placeholder="Ingressar em uma conta conjunta"
                value={joinCode}
                maxLength={8}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                aria-label="Código de convite"
              />
              <button
                type="button"
                onClick={handleJoin}
                disabled={joining || !joinCode.trim()}
                className="btn-primary shrink-0"
              >
                {joining ? "..." : "Ingressar"}
              </button>
            </div>
            {joinFeedback && (
              <p
                role="alert"
                className={`mt-3 rounded-2xl p-3 text-sm ${
                  joinFeedback.ok
                    ? "bg-emerald-400/10 text-pos"
                    : "bg-rose-400/10 text-neg"
                }`}
              >
                {joinFeedback.message}
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-rose-400/10 p-3 text-sm text-neg">
          {error}
        </p>
      )}
    </GlassCard>
  );
}
