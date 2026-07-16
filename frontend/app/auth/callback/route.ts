import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const isRecovery = searchParams.get("next") === "recovery";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", origin));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return NextResponse.redirect(new URL("/login?error=config", origin));
  }

  // Recuperação de senha precisa manter a sessão para chegar até /redefinir-senha
  // e chamar updateUser; confirmação de cadastro não deve manter o usuário logado.
  const destination = isRecovery ? "/redefinir-senha" : "/login?confirmed=1";
  const response = NextResponse.redirect(new URL(destination, origin));
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  }

  if (!isRecovery) {
    // O primeiro acesso após confirmar o e-mail deve acontecer explicitamente pela tela de login.
    await supabase.auth.signOut({ scope: "local" });
  }

  return response;
}
