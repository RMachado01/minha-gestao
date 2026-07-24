import { NextResponse, type NextRequest } from "next/server";
import { getRequestClient } from "@/lib/supabase/routeClient";

export const runtime = "nodejs";

/**
 * Salva (ou atualiza) a inscrição de push do navegador atual para o usuário
 * autenticado. O client envia o PushSubscription serializado.
 */
export async function POST(request: NextRequest) {
  const auth = await getRequestClient(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const sub = body as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };
  const endpoint = typeof sub.endpoint === "string" ? sub.endpoint : "";
  const p256dh = typeof sub.keys?.p256dh === "string" ? sub.keys.p256dh : "";
  const authKey = typeof sub.keys?.auth === "string" ? sub.keys.auth : "";
  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null;

  const { error } = await auth.supabase.from("push_subscriptions").upsert(
    {
      user_id: auth.userId,
      endpoint,
      p256dh,
      auth: authKey,
      user_agent: userAgent,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
