"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { usePushNotifications } from "@/lib/usePushNotifications";
import { createClient } from "@/lib/supabase/client";

export function NotificationSettings() {
  const { supported, subscribed, status, busy, error, subscribe, unsubscribe, sendTest } =
    usePushNotifications();
  const [testSent, setTestSent] = useState(false);
  const [prefs, setPrefs] = useState({ bills: true, budgets: true });
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      if (!supabase) return;
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("notify_bills,notify_budgets")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (!active) return;
      setPrefs({
        bills: data?.notify_bills ?? true,
        budgets: data?.notify_budgets ?? true,
      });
      setPrefsLoaded(true);
    }
    void load();
    return () => { active = false; };
  }, []);

  async function updatePref(key: "bills" | "budgets", value: boolean) {
    setPrefs((current) => ({ ...current, [key]: value }));
    const supabase = createClient();
    if (!supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const column = key === "bills" ? "notify_bills" : "notify_budgets";
    await supabase.from("profiles").update({ [column]: value }).eq("id", userData.user.id);
  }

  async function handleTest() {
    const ok = await sendTest();
    if (ok) {
      setTestSent(true);
      window.setTimeout(() => setTestSent(false), 2500);
    }
  }

  return (
    <GlassCard variant="liquid" className="col-span-12 lg:col-span-6">
      <div className="flex items-center gap-3">
        <Bell className="size-5 text-accent" />
        <div>
          <h3 className="font-semibold text-ink">Notificações</h3>
          <p className="text-sm text-ink-muted">Avisos de faturas e orçamentos no seu aparelho</p>
        </div>
      </div>

      {!supported ? (
        <p className="mt-5 rounded-2xl border border-dashed border-[var(--color-line)] p-4 text-sm text-ink-muted">
          Este navegador não suporta notificações push. No iPhone, instale o app na
          tela de início (Compartilhar → Adicionar à Tela de Início) para ativar.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {!subscribed ? (
            <button
              type="button"
              onClick={subscribe}
              disabled={busy || status === "denied"}
              className="btn-primary"
            >
              <Bell className="size-4" />
              {busy ? "Ativando..." : "Ativar notificações"}
            </button>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleTest}
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-line)] px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
              >
                <Send className="size-4" />
                {testSent ? "Enviado!" : "Enviar teste"}
              </button>
              <button
                type="button"
                onClick={unsubscribe}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/30 px-4 py-2.5 text-sm font-medium text-neg transition-colors hover:bg-rose-400/10"
              >
                <BellOff className="size-4" />
                Desativar
              </button>
            </div>
          )}

          {status === "denied" && (
            <p className="rounded-2xl bg-amber-400/10 p-3 text-sm text-warn">
              As notificações estão bloqueadas para este site. Libere nas configurações
              do navegador para ativar.
            </p>
          )}

          {/* Preferências de quais avisos receber */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-3 text-sm text-ink-soft">
              <input
                type="checkbox"
                className="size-4"
                checked={prefs.bills}
                disabled={!prefsLoaded}
                onChange={(e) => updatePref("bills", e.target.checked)}
              />
              Fatura do cartão vencendo
            </label>
            <label className="flex items-center gap-3 text-sm text-ink-soft">
              <input
                type="checkbox"
                className="size-4"
                checked={prefs.budgets}
                disabled={!prefsLoaded}
                onChange={(e) => updatePref("budgets", e.target.checked)}
              />
              Orçamento da categoria estourado
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-ink-muted">
                em breve
              </span>
            </label>
          </div>

          {error && (
            <p role="alert" className="rounded-2xl bg-rose-400/10 p-3 text-sm text-neg">
              {error}
            </p>
          )}
        </div>
      )}
    </GlassCard>
  );
}
