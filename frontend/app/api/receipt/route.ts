import { NextResponse, type NextRequest } from "next/server";
import { getRequestUserId } from "@/lib/supabase/routeUser";

/**
 * Extrai dados de um comprovante/nota fiscal a partir de uma foto, usando o
 * modelo de visão do Groq. A imagem é enviada como data URL (já reduzida no
 * client). A chave GROQ_API_KEY fica só no servidor e a rota exige sessão.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Modelo de visão do Groq. Confira os IDs atuais em
// https://console.groq.com/docs/models e ajuste via GROQ_VISION_MODEL.
const DEFAULT_VISION_MODEL = "llama-3.2-11b-vision-preview";

const CATEGORIES = ["Alimentação", "Moradia", "Transporte", "Saúde", "Lazer", "Educação", "Assinatura", "Outros"];

const INSTRUCTION = [
  "Você extrai dados de comprovantes/notas fiscais brasileiros a partir da imagem.",
  "Responda APENAS com um objeto JSON, sem texto ao redor, no formato:",
  '{"amount": number, "date": "YYYY-MM-DD" | null, "description": string, "category": string}',
  "- amount: valor TOTAL pago, número positivo com ponto decimal.",
  "- date: data da compra (YYYY-MM-DD); se não encontrar, null.",
  "- description: nome do estabelecimento/loja, curto.",
  `- category: uma de [${CATEGORIES.join(", ")}]; se incerto, "Outros".`,
  'Se a imagem não for um comprovante legível, responda {"error":"ilegivel"}.',
].join(" ");

interface Extracted {
  amount: number | null;
  date: string | null;
  description: string;
  category: string;
}

/** Extrai o primeiro objeto JSON do texto, tolerando cercas de código. */
function parseJsonLoose(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 501 });
  }

  const userId = await getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const image = typeof (body as { image?: unknown })?.image === "string" ? (body as { image: string }).image : "";
  if (!image.startsWith("data:image/")) {
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }

  const model = process.env.GROQ_VISION_MODEL ?? DEFAULT_VISION_MODEL;
  const payload = {
    model,
    temperature: 0,
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: INSTRUCTION },
          { type: "image_url", image_url: { url: image } },
        ],
      },
    ],
  };

  try {
    const resp = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      return NextResponse.json({ error: "upstream_error" }, { status: 502 });
    }
    const json = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content ?? "";
    const parsed = parseJsonLoose(content);
    if (!parsed) {
      return NextResponse.json({ error: "unreadable" }, { status: 422 });
    }
    if (parsed.error) {
      return NextResponse.json({ error: "unreadable" }, { status: 422 });
    }

    const amountRaw = parsed.amount;
    const amount = typeof amountRaw === "number" ? amountRaw : Number(String(amountRaw ?? "").replace(",", "."));
    const category = typeof parsed.category === "string" && CATEGORIES.includes(parsed.category) ? parsed.category : "Outros";
    const result: Extracted = {
      amount: Number.isFinite(amount) && amount > 0 ? Math.abs(amount) : null,
      date: typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : null,
      description: typeof parsed.description === "string" ? parsed.description.trim().slice(0, 120) : "",
      category,
    };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "network_error" }, { status: 502 });
  }
}
