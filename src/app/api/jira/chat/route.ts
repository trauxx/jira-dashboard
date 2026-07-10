import { NextResponse } from "next/server";

const OWU_URL = "http://44.195.169.137:3000/api/chat/completions";
const OWU_BASE_MODEL = "claude-sonnet-4";

async function getOwuToken(): Promise<string> {
  const res = await fetch("http://44.195.169.137:3000/api/v1/auths/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.OWU_EMAIL, password: process.env.OWU_PASSWORD }),
  });
  if (!res.ok) throw new Error("Falha ao autenticar no Open WebUI");
  return (await res.json()).token;
}

function parseSSE(body: string): string {
  let content = "";
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("data: ")) continue;
    const raw = t.slice(6);
    if (raw === "[DONE]") break;
    try {
      const d = JSON.parse(raw).choices?.[0]?.delta?.content;
      if (d && !(/Pensando/i.test(d) && d.length < 50)) content += d;
    } catch { /* skip */ }
  }
  return content.trim();
}

function extractJSON(text: string): Record<string, string> | null {
  const m = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  try { return JSON.parse(m ? m[1] : text); } catch { return null; }
}

async function createJiraIssue(data: Record<string, string>, label: string) {
  const domain = process.env.JIRA_DOMAIN || "isa-meubilhete.atlassian.net";
  const email = process.env.JIRA_EMAIL || "leonardocastro.consultor@gmail.com";
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!apiToken) throw new Error("JIRA_API_TOKEN não configurado no servidor");

  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");

  const issueType = ["bug", "Bug"].includes(data.tipo || "") ? "Bug"
    : ["melhoria", "Story"].includes(data.tipo || "") ? "Story" : "Task";

  const priorityName = data.prioridade === "Crítica" || data.prioridade === "Alta" ? "High"
    : data.prioridade === "Média" ? "Medium" : "Low";

  const descParts = [
    data.descricao,
    data.produto ? `\n\n**Produto:** ${data.produto}` : "",
    data.empresa ? `**Empresa:** ${data.empresa}` : "",
    data.passo_a_passo ? `\n**Passo a passo:**\n${data.passo_a_passo}` : "",
    data.quando ? `\n**Quando:** ${data.quando}` : "",
    data.usuario ? `\n**Usuário/PDV:** ${data.usuario}` : "",
  ];
  const descText = descParts.filter(Boolean).join("\n");

  const payload = {
    fields: {
      project: { key: label === "ISA" ? "ISA" : "MB" },
      summary: data.summary || "Sem título",
      issuetype: { name: issueType },
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: descText },
            ],
          },
        ],
      },
      labels: [label],
      priority: { name: priorityName },
    },
  };

  const res = await fetch(`https://${domain}/rest/api/3/issue`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  if (!res.ok) throw new Error(`Jira ${res.status}: ${JSON.stringify(result).slice(0, 500)}`);

  return {
    key: result.key,
    url: `https://${domain}/browse/${result.key}`,
  };
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
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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
    if (!reply) return NextResponse.json({ error: "Resposta vazia" }, { status: 502 });

    if (reply.includes("CRIAR_TICKET")) {
      const jsonPart = reply.replace(/.*CRIAR_TICKET\s*/, "").trim();
      const ticketData = extractJSON(jsonPart);
      if (!ticketData) {
        return NextResponse.json({ message: reply });
      }

      const label = messages.find(m => m.role === "system")?.content?.includes('"ISA"') ? "ISA" : "MB";
      const jira = await createJiraIssue(ticketData, label);

      return NextResponse.json({
        message: `✅ Ticket **${jira.key}** criado com sucesso!\n\n${jira.url}`,
        ticket: jira,
      });
    }

    return NextResponse.json({ message: reply });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 500 },
    );
  }
}
