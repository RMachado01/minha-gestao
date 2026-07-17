"use client";

import { useEffect, useRef, useState } from "react";
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
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    stateCode: "",
    currency: "BRL",
  });
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const { accent, setAccent, setPhoto, setName } = usePersonalization();
  const { isUber, setUberMode } = useUberMode();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    function syncTheme() {
      setIsDark(document.documentElement.dataset.theme !== "light");
    }

    syncTheme();
    window.addEventListener("mg-theme-change", syncTheme);
    return () => window.removeEventListener("mg-theme-change", syncTheme);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const supabase = createClient();
      if (!supabase) {
        if (active) {
          setProfileError("Supabase não configurado.");
          setProfileLoading(false);
        }
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!active) return;
      if (userError || !userData.user) {
        setProfileError("Não foi possível identificar sua conta.");
        setProfileLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,phone,state_code,currency")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setProfileError("Não foi possível carregar seu perfil.");
      } else {
        setProfile({
          fullName: data?.full_name ?? "",
          email: userData.user.email ?? "",
          phone: data?.phone ?? "",
          stateCode: data?.state_code ?? "",
          currency: data?.currency ?? "BRL",
        });
      }
      setProfileLoading(false);
    }

    void loadProfile();
    return () => { active = false; };
  }, []);

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
    setIsDark(next === "dark");
    window.dispatchEvent(new Event("mg-theme-change"));
  }

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError("");
    setSaved(false);
    const supabase = createClient();
    if (!supabase) {
      setProfileError("Supabase não configurado.");
      setProfileSaving(false);
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setProfileError("Sua sessão expirou. Entre novamente para salvar.");
      setProfileSaving(false);
      return;
    }

    const fullName = profile.fullName.trim();
    if (!fullName) {
      setProfileError("Informe seu nome completo.");
      setProfileSaving(false);
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: userData.user.id,
      full_name: fullName,
      phone: profile.phone.trim() || null,
      state_code: profile.stateCode || null,
      currency: profile.currency,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setProfileError("Não foi possível salvar o perfil. Tente novamente.");
      setProfileSaving(false);
      return;
    }

    setName(fullName);
    setProfile((current) => ({ ...current, fullName }));
    setSaved(true);
    setProfileSaving(false);
    window.setTimeout(() => setSaved(false), 2200);
  }

  async function handleExportData() {
    setExporting(true);
    setExportError("");
    const supabase = createClient();
    if (!supabase) {
      setExportError("Supabase não configurado.");
      setExporting(false);
      return;
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setExportError("Sua sessão expirou. Entre novamente para exportar.");
      setExporting(false);
      return;
    }

    const tables = [
      "profiles",
      "households",
      "household_members",
      "categories",
      "recurrence_rules",
      "credit_cards",
      "credit_card_bills",
      "transactions",
      "investments",
      "investment_snapshots",
      "investment_income",
      "financial_goals",
      "goal_events",
      "vehicles",
      "uber_daily_entries",
      "consent_logs",
    ];
    const exportData: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      user: { id: user.id, email: user.email, created_at: user.created_at },
    };

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        setExportError(`Não foi possível exportar a tabela ${table}. Nenhum arquivo foi gerado.`);
        setExporting(false);
        return;
      }
      exportData[table] = data ?? [];
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
    setDeleteError("");
    const supabase = createClient();
    if (!supabase) {
      setDeleteError("Supabase não configurado. A conta não foi excluída.");
      setDeleting(false);
      return;
    }

    const { error } = await supabase.rpc("delete_own_account");
    if (error) {
      setDeleteError("Não foi possível excluir a conta. Seus dados continuam intactos. Tente novamente ou contate o suporte.");
      setDeleting(false);
      return;
    }

    await supabase.auth.signOut({ scope: "local" });
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("mg-")) localStorage.removeItem(key);
    }
    router.replace("/login?account=deleted");
    router.refresh();
  }

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
            onSubmit={handleSaveProfile}
          >
            <label className="field-label sm:col-span-2">
              Nome completo
              <input
                name="fullName"
                className="field"
                placeholder="Seu nome completo"
                value={profile.fullName}
                onChange={(event) => setProfile((current) => ({ ...current, fullName: event.target.value }))}
                disabled={profileLoading || profileSaving}
                required
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
                  value={profile.email}
                  readOnly
                  aria-describedby="profile-email-help"
                />
              </div>
              <span id="profile-email-help" className="field-help">Altere o e-mail pela autenticação da conta.</span>
            </label>
            <label className="field-label">
              Telefone
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
                <input
                  className="field field-with-leading"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={profile.phone}
                  onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
                  disabled={profileLoading || profileSaving}
                />
              </div>
            </label>
            <label className="field-label">
              Estado
              <select className="field" value={profile.stateCode} onChange={(event) => setProfile((current) => ({ ...current, stateCode: event.target.value }))} disabled={profileLoading || profileSaving}>
                <option value="" disabled>Selecione</option>
                {"AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ").map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </label>
            <label className="field-label">
              Moeda
              <select className="field" value={profile.currency} onChange={(event) => setProfile((current) => ({ ...current, currency: event.target.value }))} disabled={profileLoading || profileSaving}>
                <option value="BRL">BRL — Real brasileiro</option>
              </select>
            </label>
            {profileError && <p role="alert" className="rounded-2xl bg-rose-400/10 p-3 text-sm text-neg sm:col-span-2">{profileError}</p>}
            <button className="btn-primary sm:col-span-2" type="submit" disabled={profileLoading || profileSaving}>
              {saved ? (
                <>
                  <Check className="size-4" />
                  Alterações salvas
                </>
              ) : profileSaving ? (
                "Salvando..."
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
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-line)] p-5">
            <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-warn">
              Recurso planejado
            </span>
            <p className="mt-3 text-sm font-medium text-ink">Compartilhamento familiar ainda não está disponível.</p>
            <p className="mt-1 text-sm text-ink-muted">
              A estrutura de permissões está sendo preparada, mas convites por e-mail e gestão de acessos ainda exigem um fluxo seguro no servidor.
            </p>
          </div>
          <div className="mt-5 flex gap-3 rounded-2xl bg-emerald-400/10 p-4 text-sm text-ink-soft">
            <ShieldCheck className="size-5 shrink-0 text-pos" />
            <p>
              Quando lançado, cada familiar terá login próprio e acesso limitado
              por políticas RLS do Supabase.
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
          {exportError && <p role="alert" className="mt-3 rounded-2xl bg-rose-400/10 p-3 text-sm text-neg">{exportError}</p>}
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
              {deleteError && <p role="alert" className="rounded-2xl bg-rose-400/10 p-3 text-sm text-neg">{deleteError}</p>}
            </div>
          )}
        </GlassCard>
      </BentoGrid>
    </section>
  );
}
