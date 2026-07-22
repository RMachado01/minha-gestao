import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Proxy server-side para o Groq (provedor de LLM do MVP). A chave GROQ_API_KEY
 * nunca vai ao client. O endpoint exige sessão autenticada do Supabase para
 * não ser abusado por terceiros (consumindo a cota da conta).
 *
 * Groq é compatível com a API da OpenAI, então basta um fetch.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = [
  "Você é o assistente financeiro do app \"minha-gestão\", em português do Brasil.",
  "Responda apenas com base nos dados da conta fornecidos na mensagem do usuário.",
  "Nunca invente valores: se um número não estiver nos dados, diga que não há essa informação cadastrada.",
  "Seja direto e conciso (2 a 5 frases). Use R$ com duas casas quando citar valores.",
  "Não dê recomendações de investimento específicas nem promessas de rentabilidade.",
].join(" ");

async function getUserId(request: NextRequest): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: () => {
        /* rota somente-leitura: não renova cookies */
      },
    },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // IA não configurada — o client cai no modo baseado em regras.
    return NextResponse.json({ error: "not_configured" }, { status: 501 });
  }

  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const question = typeof (body as { question?: unknown })?.question === "string" ? (body as { question: string }).question.trim() : "";
  const context = typeof (body as { context?: unknown })?.context === "string" ? (body as { context: string }).context : "";
  if (!question) {
    return NextResponse.json({ error: "empty_question" }, { status: 400 });
  }

  const model = process.env.GROQ_MODEL ?? DEFAULT_MODEL;
  const payload = {
    model,
    temperature: 0.2,
    max_tokens: 600,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Dados da minha conta (use somente estes números):\n${context || "(sem dados cadastrados)"}\n\nPergunta: ${question}`,
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
    const answer = json.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      return NextResponse.json({ error: "empty_answer" }, { status: 502 });
    }
    return NextResponse.json({ answer, model });
  } catch {
    return NextResponse.json({ error: "network_error" }, { status: 502 });
  }
}
