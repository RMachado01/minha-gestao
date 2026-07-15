import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", origin));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return NextResponse.redirect(new URL("/login?error=config", origin));
  }

  const response = NextResponse.redirect(new URL("/login?confirmed=1", origin));
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

  // A confirmação valida o e-mail, mas não mantém o usuário autenticado.
  // O primeiro acesso deve acontecer explicitamente pela tela de login.
  await supabase.auth.signOut({ scope: "local" });

  return response;
}
