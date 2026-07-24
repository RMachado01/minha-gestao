import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPushConfigured, sendPush, type PushSubscriptionRecord } from "@/lib/push/send";

export const runtime = "nodejs";

/**
 * Cron diário: lembra o usuário de faturas de cartão que vencem amanhã.
 * Protegido por CRON_SECRET (header Authorization: Bearer <secret>), o padrão
 * do Vercel Cron. Usa service role para varrer todos os usuários.
 *
 * Escopo desta versão: lembrete de vencimento de fatura. Avisos de orçamento
 * estourado exigem controle de "já avisei" para não repetir todo dia e ficam
 * para um próximo incremento.
 */
function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  if (!isPushConfigured()) {
    return NextResponse.json({ error: "push_not_configured" }, { status: 501 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 501 });
  }

  // "Amanhã" no fuso do Brasil (UTC-3), sem depender de libs de timezone.
  const brNow = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const tomorrow = new Date(brNow);
  tomorrow.setUTCDate(brNow.getUTCDate() + 1);
  const tomorrowDay = tomorrow.getUTCDate();
  const refMonth = `${brNow.getUTCFullYear()}-${String(brNow.getUTCMonth() + 1).padStart(2, "0")}`;

  // Cartões de crédito cuja fatura vence amanhã.
  const { data: cards, error: cardsError } = await admin
    .from("credit_cards")
    .select("id,user_id,nickname,due_day")
    .eq("active", true)
    .eq("card_type", "credit")
    .eq("due_day", tomorrowDay);
  if (cardsError) {
    return NextResponse.json({ error: "cards_failed" }, { status: 500 });
  }
  if (!cards || cards.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: "no_due_cards" });
  }

  const cardIds = cards.map((c) => c.id as string);
  const userIds = Array.from(new Set(cards.map((c) => c.user_id as string)));

  // Valor da fatura do mês atual por cartão.
  const { data: bills } = await admin
    .from("vw_fatura_cartao_mensal")
    .select("credit_card_id,total")
    .eq("reference_month", refMonth)
    .in("credit_card_id", cardIds);
  const billByCard = new Map<string, number>();
  for (const bill of bills ?? []) {
    billByCard.set(bill.credit_card_id as string, Number(bill.total));
  }

  // Usuários que aceitam lembrete de fatura.
  const { data: prefs } = await admin
    .from("profiles")
    .select("id,notify_bills")
    .in("id", userIds);
  const wantsBills = new Set(
    (prefs ?? []).filter((p) => p.notify_bills !== false).map((p) => p.id as string),
  );

  // Inscrições de push por usuário.
  const { data: subsData } = await admin
    .from("push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth")
    .in("user_id", userIds);
  const subsByUser = new Map<string, PushSubscriptionRecord[]>();
  for (const sub of subsData ?? []) {
    const list = subsByUser.get(sub.user_id as string) ?? [];
    list.push(sub as PushSubscriptionRecord);
    subsByUser.set(sub.user_id as string, list);
  }

  let totalSent = 0;
  const expired: string[] = [];
  for (const card of cards) {
    const userId = card.user_id as string;
    if (!wantsBills.has(userId)) continue;
    const amount = billByCard.get(card.id as string) ?? 0;
    if (amount <= 0) continue;
    const subs = subsByUser.get(userId);
    if (!subs || subs.length === 0) continue;

    const result = await sendPush(subs, {
      title: "Fatura vence amanhã",
      body: `Sua fatura do ${card.nickname} de ${formatBRL(amount)} vence amanhã.`,
      url: "/cartoes",
      tag: `bill-${card.id}`,
    });
    totalSent += result.sent;
    expired.push(...result.expiredEndpoints);
  }

  if (expired.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", expired);
  }

  return NextResponse.json({ ok: true, sent: totalSent });
}
