import { NextResponse } from "next/server";

const OWU_URL = "http://44.195.169.137:3000/api/chat/completions";
const OWU_BASE_MODEL = "claude-sonnet-4";

async function getOwuToken(): Promise<string> {
  const res = await fetch("http://44.195.169.137:3000/api/v1/auths/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "leonardocastro.consultor@gmail.com",
      password: "odranoeL6@",
    }),
  });

  if (!res.ok) {
    throw new Error("Falha ao autenticar no Open WebUI");
  }

  const data = await res.json();
  return data.token;
}

function parseSSE(body: string): string {
  let content = "";
  const lines = body.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data: ")) continue;
    const jsonStr = trimmed.slice(6);
    if (jsonStr === "[DONE]") break;
    try {
      const chunk = JSON.parse(jsonStr);
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) content += delta;
    } catch {
      continue;
    }
  }
  return content;
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Mensagens são obrigatórias" },
        { status: 400 },
      );
    }

    const token = await getOwuToken();

    const res = await fetch(OWU_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OWU_BASE_MODEL,
        messages,
        stream: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Erro do Open WebUI (${res.status})`, detail: errText.slice(0, 500) },
        { status: res.status },
      );
    }

    const rawBody = await res.text();
    const reply = parseSSE(rawBody);

    if (!reply) {
      return NextResponse.json(
        { error: "Resposta vazia do Open WebUI", raw: rawBody.slice(0, 300) },
        { status: 502 },
      );
    }

    return NextResponse.json({ message: reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
