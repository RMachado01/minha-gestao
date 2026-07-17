import Link from "next/link";
import { LockKeyhole, Wallet } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmed?: string; error?: string; reset?: string; account?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="relative grid min-h-dvh min-w-0 max-w-full place-items-center overflow-hidden px-3 py-6 sm:px-4 sm:py-10">
      {/* Animated background orbs — green brand */}
      <div
        aria-hidden
        className="login-float absolute left-[5%] top-[10%] size-80 rounded-full bg-[#006b3f]/20 blur-[80px]"
      />
      <div
        aria-hidden
        className="login-float-delayed absolute bottom-[8%] right-[8%] size-96 rounded-full bg-[#00a86b]/15 blur-[100px]"
      />
      <div
        aria-hidden
        className="login-pulse absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-[#006b3f]/10 blur-[120px]"
      />

      {/* Card */}
      <section
        className="login-card-enter ios-glass relative w-full min-w-0 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[1.5rem] p-5 sm:max-w-md sm:rounded-[2rem] sm:p-9"
        aria-labelledby="login-title"
      >
        {/* Brand header */}
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#006b3f]/20 text-[#00a86b]">
            <Wallet className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-ink">Minha Gestão</p>
            <p className="text-xs text-ink-muted">Sua vida financeira, clara.</p>
          </div>
        </div>

        <h1
          id="login-title"
          className="text-3xl font-semibold tracking-tight text-ink"
        >
          Bem-vindo de volta
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Entre para acompanhar seu saldo, cartões e ganhos.
        </p>

        {params.confirmed === "1" && (
          <p role="status" className="mt-6 rounded-2xl bg-emerald-400/10 p-4 text-sm text-pos">
            E-mail confirmado com sucesso. Entre com seu e-mail e senha para acessar sua conta.
          </p>
        )}

        {params.error && (
          <p role="alert" className="mt-6 rounded-2xl bg-rose-400/10 p-4 text-sm text-neg">
            Não foi possível confirmar sua conta. Solicite um novo link e tente novamente.
          </p>
        )}

        {params.reset === "1" && (
          <p role="status" className="mt-6 rounded-2xl bg-emerald-400/10 p-4 text-sm text-pos">
            Senha atualizada com sucesso. Entre com sua nova senha.
          </p>
        )}

        {params.account === "deleted" && (
          <p role="status" className="mt-6 rounded-2xl bg-emerald-400/10 p-4 text-sm text-pos">
            Conta e dados removidos com sucesso.
          </p>
        )}

        <LoginForm />

        <p className="mt-5 text-center text-sm text-ink-soft">
          Não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-accent hover:underline">
            Criar conta
          </Link>
        </p>

        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-ink-muted">
          <LockKeyhole className="size-3.5" />
          Sessão protegida e dados criptografados
        </p>
      </section>
    </main>
  );
}
