import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = new Set([
  "/login",
  "/cadastro",
  "/termos",
  "/privacidade",
  "/redefinir-senha",
  "/manutencao",
]);

export async function proxy(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE === "true" && request.nextUrl.pathname !== "/manutencao") {
    return NextResponse.redirect(new URL("/manutencao", request.url));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const isPublic = PUBLIC_ROUTES.has(request.nextUrl.pathname) || request.nextUrl.pathname.startsWith("/auth/");

  if (!url || !key) {
    if (isPublic || process.env.NODE_ENV !== "production") return NextResponse.next();
    return NextResponse.redirect(new URL("/manutencao?motivo=configuracao", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, { cookies: { getAll: () => request.cookies.getAll(), setAll: (items) => { items.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } } });
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthEntry = request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/cadastro";
  if (!user && !isPublic) return NextResponse.redirect(new URL("/login", request.url));
  if (user && isAuthEntry) return NextResponse.redirect(new URL("/", request.url));
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
