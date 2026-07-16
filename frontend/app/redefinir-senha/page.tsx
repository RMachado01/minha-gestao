"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, LockKeyhole, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    const supabase = createClient();
    if (!supabase) {
      setError("Configure as variáveis do Supabase para ativar a redefinição de senha.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("Não foi possível atualizar a senha. Solicite um novo link e tente novamente.");
      setLoading(false);
      return;
    }

    // A troca de senha não mantém a sessão ativa — o próximo acesso é explícito pela tela de login.
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/login?reset=1");
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div aria-hidden className="login-float absolute left-[5%] top-[10%] size-80 rounded-full bg-[#006b3f]/20 blur-[80px]" />
      <div aria-hidden className="login-float-delayed absolute bottom-[8%] right-[8%] size-96 rounded-full bg-[#00a86b]/15 blur-[100px]" />
      <div aria-hidden className="login-pulse absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-[#006b3f]/10 blur-[120px]" />

      <section className="login-card-enter ios-glass relative w-full max-w-md overflow-hidden rounded-[2rem] p-7 sm:p-9" aria-labelledby="redefinir-title">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#006b3f]/20 text-[#00a86b]">
            <Wallet className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-ink">Minha Gestão</p>
            <p className="text-xs text-ink-muted">Sua vida financeira, clara.</p>
          </div>
        </div>

        <h1 id="redefinir-title" className="text-3xl font-semibold tracking-tight text-ink">Nova senha</h1>
        <p className="mt-2 text-sm text-ink-soft">Escolha uma nova senha para sua conta.</p>

        <form className="mt-7 space-y-4" onSubmit={submit}>
          <label className="field-label">
            Nova senha
            <input className="field" name="password" type="password" autoComplete="new-password" placeholder="••••••••" minLength={8} required />
          </label>
          <label className="field-label">
            Confirmar nova senha
            <input className="field" name="confirmPassword" type="password" autoComplete="new-password" placeholder="••••••••" required />
          </label>

          {error && <p role="alert" className="rounded-2xl bg-rose-400/10 p-3 text-sm text-neg">{error}</p>}

          <button type="submit" className="btn-primary mt-2 w-full" disabled={loading}>
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : <>Salvar nova senha <ArrowRight className="size-4" /></>}
          </button>
        </form>

        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-ink-muted">
          <LockKeyhole className="size-3.5" />
          Sessão protegida e dados criptografados
        </p>
      </section>
    </main>
  );
}
