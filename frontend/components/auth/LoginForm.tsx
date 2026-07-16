"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Captcha, isCaptchaEnabled, type CaptchaHandle } from "@/components/auth/Captcha";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaHandle>(null);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetCaptchaToken, setResetCaptchaToken] = useState<string | null>(null);
  const resetCaptchaRef = useRef<CaptchaHandle>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    if (isCaptchaEnabled() && !captchaToken) { setError("Resolva o captcha para continuar."); setLoading(false); return; }
    const data = new FormData(event.currentTarget); const supabase = createClient();
    if (!supabase) { setError("Configure as variáveis do Supabase para ativar o login. O modo protótipo continua disponível."); setLoading(false); return; }
    const result = await supabase.auth.signInWithPassword({
      email: String(data.get("email")),
      password: String(data.get("password")),
      options: { captchaToken: captchaToken ?? undefined },
    });
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(null);
    if (result.error) { setError("E-mail ou senha inválidos."); setLoading(false); return; }
    router.replace("/"); router.refresh();
  }

  async function submitReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetSending(true);
    setResetError("");
    if (isCaptchaEnabled() && !resetCaptchaToken) { setResetError("Resolva o captcha para continuar."); setResetSending(false); return; }
    const supabase = createClient();
    if (!supabase) {
      setResetError("Configure as variáveis do Supabase para ativar a recuperação de senha.");
      setResetSending(false);
      return;
    }
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=recovery`,
      captchaToken: resetCaptchaToken ?? undefined,
    });
    resetCaptchaRef.current?.resetCaptcha();
    setResetCaptchaToken(null);
    if (sendError) {
      setResetError("Não foi possível enviar o link. Confira o e-mail e tente novamente.");
      setResetSending(false);
      return;
    }
    setResetSent(true);
    setResetSending(false);
  }

  if (showReset) {
    return (
      <form className="mt-7 space-y-4" onSubmit={submitReset}>
        <p className="text-sm text-ink-soft">Informe seu e-mail para receber um link de redefinição de senha.</p>
        <label className="field-label">
          E-mail
          <input className="field" type="email" autoComplete="email" placeholder="voce@email.com" required value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} disabled={resetSent} />
        </label>
        {!resetSent && <Captcha ref={resetCaptchaRef} onVerify={setResetCaptchaToken} onExpire={() => setResetCaptchaToken(null)} />}
        {resetError && <p role="alert" className="rounded-2xl bg-rose-400/10 p-3 text-sm text-neg">{resetError}</p>}
        {resetSent && (
          <p role="status" className="flex items-center gap-2 rounded-2xl bg-emerald-400/10 p-3 text-sm text-pos">
            <Check className="size-4 shrink-0" />
            Link enviado. Confira sua caixa de entrada para redefinir a senha.
          </p>
        )}
        {!resetSent && (
          <button
            type="submit"
            className="btn-primary mt-2 w-full"
            disabled={resetSending || (isCaptchaEnabled() && !resetCaptchaToken)}
          >
            {resetSending ? <LoaderCircle className="size-4 animate-spin" /> : "Enviar link de redefinição"}
          </button>
        )}
        <button
          type="button"
          className="w-full text-center text-sm font-medium text-accent hover:underline"
          onClick={() => { setShowReset(false); setResetSent(false); setResetError(""); setResetEmail(""); }}
        >
          Voltar para o login
        </button>
      </form>
    );
  }

  return <form className="mt-7 space-y-4" onSubmit={submit}><label className="field-label">E-mail<input className="field" name="email" type="email" autoComplete="email" placeholder="voce@email.com" required /></label><label className="field-label">Senha<input className="field" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required /></label><div className="flex items-center justify-between text-sm"><label className="flex items-center gap-2 text-ink-soft"><input type="checkbox" />Lembrar de mim</label><button type="button" className="text-accent hover:underline" onClick={() => setShowReset(true)}>Esqueci a senha</button></div><Captcha ref={captchaRef} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />{error && <p role="alert" className="rounded-2xl bg-rose-400/10 p-3 text-sm text-neg">{error}</p>}<button type="submit" className="btn-primary mt-2 w-full" disabled={loading || (isCaptchaEnabled() && !captchaToken)}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : <>Entrar <ArrowRight className="size-4" /></>}</button></form>;
}
