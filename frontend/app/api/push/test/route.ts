import { NextResponse, type NextRequest } from "next/server";
import { getRequestClient } from "@/lib/supabase/routeClient";
import { isPushConfigured, sendPush, type PushSubscriptionRecord } from "@/lib/push/send";

export const runtime = "nodejs";

/**
 * Envia uma notificação de teste para todas as inscrições do usuário atual.
 * Serve para o usuário validar, na hora, que as notificações estão funcionando.
 */
export async function POST(request: NextRequest) {
  if (!isPushConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 501 });
  }
  const auth = await getRequestClient(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await auth.supabase
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("user_id", auth.userId);

  if (error) {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
  const subs = (data ?? []) as PushSubscriptionRecord[];
  if (subs.length === 0) {
    return NextResponse.json({ error: "no_subscription" }, { status: 400 });
  }

  const result = await sendPush(subs, {
    title: "Minha Gestão",
    body: "Notificações ativadas! Você receberá avisos de faturas e orçamentos por aqui.",
    url: "/",
    tag: "mg-test",
  });

  if (result.expiredEndpoints.length > 0) {
    await auth.supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", result.expiredEndpoints);
  }

  return NextResponse.json({ ok: true, sent: result.sent });
}
