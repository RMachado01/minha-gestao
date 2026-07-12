"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const data = new FormData(event.currentTarget); const supabase = createClient();
    if (!supabase) { setError("Configure as variáveis do Supabase para ativar o login. O modo protótipo continua disponível."); setLoading(false); return; }
    const result = await supabase.auth.signInWithPassword({ email: String(data.get("email")), password: String(data.get("password")) });
    if (result.error) { setError("E-mail ou senha inválidos."); setLoading(false); return; }
    router.replace("/"); router.refresh();
  }
  return <form className="mt-7 space-y-4" onSubmit={submit}><label className="field-label">E-mail<input className="field" name="email" type="email" autoComplete="email" placeholder="voce@email.com" required /></label><label className="field-label">Senha<input className="field" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required /></label><div className="flex items-center justify-between text-sm"><label className="flex items-center gap-2 text-ink-soft"><input type="checkbox" />Lembrar de mim</label><button type="button" className="text-accent hover:underline">Esqueci a senha</button></div>{error && <p role="alert" className="rounded-2xl bg-rose-400/10 p-3 text-sm text-neg">{error}</p>}<button type="submit" className="btn-primary mt-2 w-full" disabled={loading}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : <>Entrar <ArrowRight className="size-4" /></>}</button></form>;
}
