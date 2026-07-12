import { LockKeyhole, Wallet } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div aria-hidden className="absolute left-[8%] top-[8%] size-72 rounded-full bg-indigo-500/25 blur-3xl" />
      <div aria-hidden className="absolute bottom-[5%] right-[5%] size-80 rounded-full bg-cyan-400/15 blur-3xl" />
      <section className="ios-glass relative w-full max-w-md overflow-hidden rounded-[2rem] p-7 sm:p-9" aria-labelledby="login-title">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-indigo-500/20 text-accent"><Wallet className="size-5" /></span>
          <div><p className="font-semibold text-ink">Minha Gestão</p><p className="text-xs text-ink-muted">Sua vida financeira, clara.</p></div>
        </div>
        <h1 id="login-title" className="text-3xl font-semibold tracking-tight text-ink">Bem-vindo de volta</h1>
        <p className="mt-2 text-sm text-ink-soft">Entre para acompanhar seu saldo, cartões e ganhos.</p>
        <LoginForm />
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-ink-muted"><LockKeyhole className="size-3.5" />Sessão protegida e dados criptografados</p>
      </section>
    </main>
  );
}
