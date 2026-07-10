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
  if (!res.ok) throw new Error("Falha ao autenticar no Open WebUI");
  return (await res.json()).token;
}

function parseSSE(body: string): string {
  let content = "";
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data: ")) continue;
    const raw = trimmed.slice(6);
    if (raw === "[DONE]") break;
    try {
      const delta = JSON.parse(raw).choices?.[0]?.delta?.content;
      if (delta) content += delta;
    } catch {
      /* skip invalid chunks */
    }
  }
  return content.trim();
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    if (!messages?.length) {
      return NextResponse.json({ error: "Mensagens são obrigatórias" }, { status: 400 });
    }

    const token = await getOwuToken();
    const res = await fetch(OWU_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: OWU_BASE_MODEL, messages, stream: false }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Erro do Open WebUI (${res.status})`, detail: errText.slice(0, 500) },
        { status: res.status },
      );
    }

    const reply = parseSSE(await res.text());
    if (!reply) {
      return NextResponse.json({ error: "Resposta vazia do Open WebUI" }, { status: 502 });
    }

    return NextResponse.json({ message: reply });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 500 },
    );
  }
}
