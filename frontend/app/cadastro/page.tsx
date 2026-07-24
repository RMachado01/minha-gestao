"use client";

import { useRef, useState } from "react";
import { ArrowRight, LockKeyhole, LoaderCircle } from "lucide-react";
import { BunnyMark } from "@/components/ui/BunnyMark";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Captcha, isCaptchaEnabled, type CaptchaHandle } from "@/components/auth/Captcha";

export default function CadastroPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [uberMode, setUberMode] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaHandle>(null);

  function handleUberToggle(checked: boolean) {
    setUberMode(checked);
    if (typeof window !== "undefined") {
      localStorage.setItem("mg-uber-mode", String(checked));
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    const confirmPassword = String(data.get("confirmPassword"));

    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      setLoading(false);
      return;
    }

    if (!acceptedTerms) {
      setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade.");
      setLoading(false);
      return;
    }

    if (isCaptchaEnabled() && !captchaToken) {
      setError("Resolva o captcha para continuar.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError(
        "Configure as variáveis do Supabase para ativar o cadastro. O modo protótipo continua disponível."
      );
      setLoading(false);
      return;
    }

    const result = await supabase.auth.signUp({
      email: String(data.get("email")),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: String(data.get("name")), uber_mode: uberMode },
        captchaToken: captchaToken ?? undefined,
      },
    });

    // Token do hCaptcha é de uso único — sempre reseta após a tentativa.
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(null);

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    // Supabase returns user with identities=[] when email already exists.
    // Mostramos a mesma tela de sucesso de um cadastro novo em vez de confirmar
    // que o e-mail já existe — evita enumeração de contas por um atacante.
    if (result.data.user && result.data.user.identities?.length === 0) {
      setSuccess(true);
      setLoading(false);
      return;
    }

    // Log consent (LGPD) — best effort, don't block signup
    if (result.data.user) {
      const userId = result.data.user.id;
      supabase
        .from("consent_logs")
        .insert([
          { user_id: userId, consent_type: "terms_of_use", version: "1.0", ip_address: null, user_agent: navigator.userAgent },
          { user_id: userId, consent_type: "privacy_policy", version: "1.0", ip_address: null, user_agent: navigator.userAgent },
        ])
        .then(() => {});
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <main className="relative grid min-h-dvh min-w-0 max-w-full place-items-center overflow-hidden px-3 py-6 sm:px-4 sm:py-10">
      {/* Quiet ambient depth — static to avoid decorative motion. */}
      <div
        aria-hidden
        className="login-float absolute left-[5%] top-[10%] size-80 rounded-full bg-accent/10 blur-[90px]"
      />
      <div
        aria-hidden
        className="login-float-delayed absolute bottom-[8%] right-[8%] size-96 rounded-full bg-[var(--ai-accent)]/10 blur-[110px]"
      />
      <div
        aria-hidden
        className="login-pulse absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-[120px]"
      />

      {/* Card */}
      <section
        className="login-card-enter ios-glass relative w-full min-w-0 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[1.5rem] p-5 sm:max-w-md sm:rounded-[2rem] sm:p-9"
        aria-labelledby="cadastro-title"
      >
        {/* Brand header */}
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-accent text-white">
            <BunnyMark className="size-6" />
          </span>
          <div>
            <p className="font-semibold text-ink">Minha Gestão</p>
            <p className="text-xs text-ink-muted">Clareza para decidir melhor.</p>
          </div>
        </div>

        <h1
          id="cadastro-title"
          className="login-title text-[2.25rem] font-medium leading-none tracking-[-.035em] text-ink"
        >
          Criar sua conta
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Comece a organizar suas finanças hoje.
        </p>

        {success ? (
          <div className="mt-7 space-y-4">
            <div className="rounded-2xl bg-emerald-400/10 p-5 text-center">
              <p className="text-lg font-semibold text-ink">Verifique seu e-mail</p>
              <p className="mt-2 text-sm text-ink-soft">
                Enviamos um link de confirmação. Clique nele para ativar sua conta.
              </p>
            </div>
            <Link
              href="/login"
              className="btn-primary mt-2 flex w-full items-center justify-center gap-2"
            >
              Ir para o login <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : (
        <form className="mt-7 space-y-4" onSubmit={submit}>
          <label className="field-label">
            Nome completo
            <input
              className="field"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Seu nome"
              required
            />
          </label>

          <label className="field-label">
            E-mail
            <input
              className="field"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@email.com"
              required
            />
          </label>

          <label className="field-label">
            Senha
            <input
              className="field"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={8}
              required
            />
          </label>

          <label className="field-label">
            Confirmar senha
            <input
              className="field"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              required
            />
          </label>

          {/* Uber mode toggle */}
          <div className="rounded-2xl bg-surface-card/60 p-4">
            <label className="flex items-center gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={uberMode}
                onChange={(e) => handleUberToggle(e.target.checked)}
                className="size-4 accent-[#00a86b]"
              />
              <span className="font-medium">
                Trabalho como motorista de app (Uber)
              </span>
            </label>
            <p className="mt-2 text-xs text-ink-muted">
              {uberMode
                ? "Módulo Uber ativado. Você terá acesso ao diário de corridas e cálculo de lucro."
                : "Módulo Garagem ativado. Controle de veículos e consumo."}
            </p>
          </div>

          {/* Terms acceptance — LGPD */}
          <label className="flex items-start gap-3 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 size-4 accent-[#00a86b]"
              required
            />
            <span>
              Li e aceito os{" "}
              <Link href="/termos" target="_blank" className="text-accent hover:underline">
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link href="/privacidade" target="_blank" className="text-accent hover:underline">
                Politica de Privacidade
              </Link>
              .
            </span>
          </label>

          <Captcha ref={captchaRef} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />

          {error && (
            <p role="alert" className="rounded-2xl bg-rose-400/10 p-3 text-sm text-neg">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary mt-2 w-full"
            disabled={loading || (isCaptchaEnabled() && !captchaToken)}
          >
            {loading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <>
                Criar conta <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>
        )}

        {!success && (
          <>
            <p className="mt-6 text-center text-sm text-ink-soft">
              Já tem conta?{" "}
              <Link href="/login" className="text-accent hover:underline">
                Entrar
              </Link>
            </p>

            <p className="mt-4 flex items-center justify-center gap-2 text-xs text-ink-muted">
              <LockKeyhole className="size-3.5" />
              Sessão protegida e dados criptografados
            </p>
          </>
        )}
      </section>
    </main>
  );
}
