import { NextResponse, type NextRequest } from "next/server";
import { getRequestClient } from "@/lib/supabase/routeClient";

export const runtime = "nodejs";

/** Remove a inscrição de push do navegador atual. */
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
  const endpoint = typeof (body as { endpoint?: unknown }).endpoint === "string"
    ? (body as { endpoint: string }).endpoint
    : "";
  if (!endpoint) {
    return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", auth.userId);

  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
