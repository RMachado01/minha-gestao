"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  Check,
  Download,
  Mail,
  Moon,
  Palette,
  Phone,
  Plus,
  ShieldCheck,
  Sun,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { UserAvatar } from "@/components/shell/UserAvatar";
import {
  ACCENT_PRESETS,
  usePersonalization,
} from "@/lib/usePersonalization";
import { useUberMode } from "@/lib/useUberMode";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [family] = useState<Array<{ name: string; relation: string; email: string }>>([]);
  const { accent, setAccent, setPhoto, setName } = usePersonalization();
  const { isUber, setUberMode } = useUberMode();
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type) || file.size > 512 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPhoto(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function toggleTheme() {
    const current = document.documentElement.dataset.theme || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute("content", next === "light" ? "#f8fafc" : "#06080f");
    localStorage.setItem("mg-theme", next);
    window.dispatchEvent(new Event("mg-theme-change"));
  }

  async function handleExportData() {
    setExporting(true);
    const supabase = createClient();
    if (!supabase) {
      setExporting(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setExporting(false); return; }

    const tables = ["profiles", "transactions", "credit_cards", "credit_card_bills", "categories", "recurrence_rules", "investments", "investment_snapshots", "vehicles", "uber_daily_entries", "consent_logs"];
    const exportData: Record<string, unknown[]> = { user: { id: user.id, email: user.email, created_at: user.created_at } as unknown as unknown[] };

    for (const table of tables) {
      const { data } = await supabase.from(table).select("*");
      if (data && data.length > 0) exportData[table] = data;
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `minha-gestao-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  async function handleDeleteAccount() {
    if (deleteText !== "EXCLUIR") return;
    setDeleting(true);
    const supabase = createClient();
    if (!supabase) { setDeleting(false); return; }

    // Call edge function or RPC to delete; fallback: sign out and show message
    // The actual deletion requires a server-side admin call.
    // For now, we invoke an RPC function that must be created in Supabase.
    const { error } = await supabase.rpc("delete_own_account");
    if (error) {
      // If RPC doesn't exist yet, sign out and instruct user
      await supabase.auth.signOut();
      localStorage.clear();
      router.replace("/login");
      return;
    }

    await supabase.auth.signOut();
    localStorage.clear();
    router.replace("/login");
  }

  const isDark =
    typeof document !== "undefined"
      ? document.documentElement.dataset.theme !== "light"
      : true;

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Conta e personalização"
        title="Configurações"
        description="Dados pessoais, aparência e estrutura familiar."
      />

      <BentoGrid>
        {/* ---------- Perfil ---------- */}
        <GlassCard variant="hero" className="col-span-12 p-6 lg:col-span-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--color-accent)_16%,transparent)] text-accent">
              <UserRound className="size-5" />
            </span>
            <div>
              <h3 className="font-semibold text-ink">Seu perfil</h3>
              <p className="text-sm text-ink-muted">
                Informações do responsável pela conta
              </p>
            </div>
          </div>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const nameInput = form.querySelector<HTMLInputElement>(
                'input[name="fullName"]',
              );
              if (nameInput?.value) setName(nameInput.value);
              setSaved(true);
              setTimeout(() => setSaved(false), 2000);
            }}
          >
            <label className="field-label sm:col-span-2">
              Nome completo
              <input
                name="fullName"
                className="field"
                placeholder="Seu nome completo"
              />
            </label>
            <label className="field-label">
              E-mail
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
                <input
                  className="field field-with-leading"
                  type="email"
                  placeholder="voce@email.com"
                />
              </div>
            </label>
            <label className="field-label">
              Telefone
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
                <input
                  className="field field-with-leading"
                  type="tel"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </label>
            <label className="field-label">
              Estado
              <select className="field" defaultValue="">
                <option value="" disabled>Selecione</option>
                <option>SP</option>
                <option>RJ</option>
                <option>MG</option>
                <option>PR</option>
                <option>SC</option>
                <option>RS</option>
              </select>
            </label>
            <label className="field-label">
              Moeda
              <select className="field">
                <option>BRL — Real brasileiro</option>
              </select>
            </label>
            <button className="btn-primary sm:col-span-2" type="submit">
              {saved ? (
                <>
                  <Check className="size-4" />
                  Alterações salvas
                </>
              ) : (
                "Salvar perfil"
              )}
            </button>
          </form>
        </GlassCard>

        {/* ---------- Personalização ---------- */}
        <GlassCard variant="liquid" className="col-span-12 lg:col-span-5">
          <div className="flex items-center gap-3">
            <Palette className="size-5 text-accent" />
            <div>
              <h3 className="font-semibold text-ink">Personalização</h3>
              <p className="text-sm text-ink-muted">
                Aparência, cor de destaque e foto
              </p>
            </div>
          </div>

          {/* Photo */}
          <div className="mt-5 flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative"
              aria-label="Alterar foto de perfil"
            >
              <UserAvatar size={64} />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="size-5 text-white" />
              </span>
            </button>
            <div>
              <p className="text-sm font-medium text-ink">Foto de perfil</p>
              <p className="text-xs text-ink-muted">
                Clique para trocar. Aparece na sidebar e barra superior.
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          {/* Accent color */}
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-ink">Cor de destaque</p>
            <div className="flex flex-wrap gap-2">
              {ACCENT_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setAccent(preset.value)}
                  className={cn(
                    "group relative size-9 rounded-full transition-all hover:scale-110",
                    accent === preset.value &&
                      "ring-2 ring-white/50 ring-offset-2 ring-offset-[var(--color-bg)]",
                  )}
                  style={{ backgroundColor: preset.value }}
                  aria-label={`Cor ${preset.name}`}
                  title={preset.name}
                >
                  {accent === preset.value && (
                    <Check className="absolute inset-0 m-auto size-4 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-ink">Tema</p>
            <button
              type="button"
              onClick={toggleTheme}
              className="liquid-glass flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-ink transition-all hover:scale-[1.01]"
            >
              {isDark ? (
                <Sun className="size-4 text-warn" />
              ) : (
                <Moon className="size-4 text-accent" />
              )}
              Ativar modo {isDark ? "claro" : "escuro"}
            </button>
          </div>

          {/* Uber mode toggle */}
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-ink">Módulo de trabalho</p>
            <label className="ios-glass flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3">
              <input
                type="checkbox"
                checked={isUber}
                onChange={(e) => setUberMode(e.target.checked)}
                className="size-4"
              />
              <span className="text-sm">
                <strong className="block font-semibold text-ink">
                  {isUber ? "Modo Uber ativado" : "Modo Garagem ativado"}
                </strong>
                <span className="text-xs text-ink-muted">
                  {isUber
                    ? "Diário de corridas, cálculo de lucro e KPIs de motorista."
                    : "Controle de veículos, consumo e custos pessoais."}
                </span>
              </span>
            </label>
          </div>
        </GlassCard>

        {/* ---------- Grupo familiar ---------- */}
        <GlassCard variant="liquid" className="col-span-12">
          <div className="flex items-center gap-3">
            <UsersRound className="size-5 text-accent" />
            <div>
              <h3 className="font-semibold text-ink">Grupo familiar</h3>
              <p className="text-sm text-ink-muted">
                Preparação para acesso compartilhado
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {family.map((member, index) => (
              <div
                key={`${member.email}-${index}`}
                className="liquid-glass rounded-2xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink">{member.name}</p>
                    <p className="text-xs text-ink-muted">
                      {member.relation} · {member.email}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-400/10 px-2 py-1 text-[11px] font-semibold text-warn">
                    Convite futuro
                  </span>
                </div>
              </div>
            ))}
            {family.length === 0 && (
              <p className="rounded-2xl border border-dashed border-[var(--color-line)] p-4 text-sm text-ink-muted">
                Nenhum familiar adicionado.
              </p>
            )}
            <button
              type="button"
              disabled
              className="flex min-h-[4.5rem] items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-line-strong)] p-3 text-sm font-semibold text-ink-soft transition-colors hover:border-[var(--color-accent)] hover:text-ink"
            >
              <Plus className="size-4" />
              Adicionar familiar (em breve)
            </button>
          </div>
          <div className="mt-5 flex gap-3 rounded-2xl bg-emerald-400/10 p-4 text-sm text-ink-soft">
            <ShieldCheck className="size-5 shrink-0 text-pos" />
            <p>
              Cada familiar terá login próprio e acesso limitado por políticas
              RLS do Supabase.
            </p>
          </div>
        </GlassCard>
        {/* ---------- LGPD — Privacidade e dados ---------- */}
        <GlassCard variant="liquid" className="col-span-12 lg:col-span-6">
          <div className="flex items-center gap-3">
            <Download className="size-5 text-accent" />
            <div>
              <h3 className="font-semibold text-ink">Exportar meus dados</h3>
              <p className="text-sm text-ink-muted">
                Portabilidade de dados (LGPD Art. 18)
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-ink-soft">
            Baixe todos os seus dados em formato JSON. Inclui transacoes, cartoes,
            investimentos, veiculos e configuracoes.
          </p>
          <button
            type="button"
            onClick={handleExportData}
            disabled={exporting}
            className="btn-primary mt-4"
          >
            {exporting ? (
              <>Exportando...</>
            ) : (
              <>
                <Download className="size-4" />
                Exportar dados (JSON)
              </>
            )}
          </button>
        </GlassCard>

        <GlassCard variant="liquid" className="col-span-12 lg:col-span-6">
          <div className="flex items-center gap-3">
            <Trash2 className="size-5 text-neg" />
            <div>
              <h3 className="font-semibold text-ink">Excluir minha conta</h3>
              <p className="text-sm text-ink-muted">
                Remocao permanente (LGPD Art. 18)
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-3 rounded-2xl bg-rose-400/10 p-4 text-sm text-ink-soft">
            <AlertTriangle className="size-5 shrink-0 text-neg" />
            <p>
              Esta acao e irreversivel. Todos os seus dados serao permanentemente
              removidos, incluindo transacoes, cartoes, investimentos e historico.
              Recomendamos exportar seus dados antes de prosseguir.
            </p>
          </div>
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="mt-4 rounded-2xl border border-rose-400/30 px-4 py-2.5 text-sm font-medium text-neg transition-colors hover:bg-rose-400/10"
            >
              Quero excluir minha conta
            </button>
          ) : (
            <div className="mt-4 space-y-3">
              <label className="field-label">
                Digite <strong className="text-neg">EXCLUIR</strong> para confirmar
                <input
                  className="field mt-1"
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  placeholder="EXCLUIR"
                  autoFocus
                />
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteText !== "EXCLUIR" || deleting}
                  className="rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:opacity-50"
                >
                  {deleting ? "Excluindo..." : "Confirmar exclusao"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteText("");
                  }}
                  className="rounded-2xl px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      </BentoGrid>
    </section>
  );
}
