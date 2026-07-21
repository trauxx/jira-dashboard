import { NextResponse } from "next/server";

const OWU_URL = "http://44.195.169.137:3000/api/chat/completions";
const OWU_BASE_MODEL = "claude-sonnet-4";

async function getOwuToken(): Promise<string> {
  const email = process.env.OWU_EMAIL || "leonardocastro.consultor@gmail.com";
  const password = process.env.OWU_PASSWORD || "odranoeL6@";
  const res = await fetch("http://44.195.169.137:3000/api/v1/auths/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
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

const issueTypeCache = new Map<string, { types: { name: string; id: string }[]; fetchedAt: number }>();
const CACHE_TTL = 300_000;

async function getProjectIssueTypes(projectKey: string, auth: string, domain: string) {
  const cached = issueTypeCache.get(projectKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.types;

  const res = await fetch(`https://${domain}/rest/api/3/issuetype/project?projectIdOrKey=${projectKey}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`Falha ao buscar issue types: ${res.status}`);
  const types: { name: string; id: string; subtask: boolean }[] = await res.json();
  const filtered = types.filter(t => !t.subtask).map(t => ({ name: t.name, id: t.id }));
  issueTypeCache.set(projectKey, { types: filtered, fetchedAt: Date.now() });
  return filtered;
}

function pickIssueType(tipo: string, availableTypes: { name: string; id: string }[]): string {
  const PREFERRED: Record<string, string[]> = {
    bug: ["Bug"],
    melhoria: ["Story"],
    feature: ["Task", "Story", "New Feature", "Improvement"],
  };

  const preferred = PREFERRED[tipo?.toLowerCase()] || ["Task", "Story"];
  for (const name of preferred) {
    const match = availableTypes.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (match) return match.name;
  }
  return availableTypes[0]?.name || "Task";
}

function fallbackIssueType(tipo: string): string {
  return ["bug", "Bug"].includes(tipo || "") ? "Bug"
    : ["melhoria", "Story"].includes(tipo || "") ? "Story" : "Task";
}

async function createJiraIssue(data: Record<string, string>, label: string) {
const domain = process.env.JIRA_DOMAIN || "traux.atlassian.net";
const email = process.env.JIRA_EMAIL || "leonardocastro.consultor@gmail.com";
const apiToken = process.env.JIRA_API_TOKEN;

  if (!apiToken) throw new Error("JIRA_API_TOKEN não configurado no servidor");

  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");
  const projectKey = label === "ISA" ? "ISA" : "MB";

  let issueType: string;
  try {
    const availableTypes = await getProjectIssueTypes(projectKey, auth, domain);
    issueType = pickIssueType(data.tipo || "", availableTypes);
  } catch {
    issueType = fallbackIssueType(data.tipo || "");
  }

  const priorityName = data.prioridade === "Crítica" || data.prioridade === "Alta" ? "High"
    : data.prioridade === "Média" ? "Medium" : "Low";

  const descParts = [
    data.descricao,
    data.produto ? `\n\n---\n**Produto:** ${data.produto}` : "",
    data.empresa ? `**Empresa:** ${data.empresa}` : "",
    data.comportamento_esperado ? `\n**Comportamento esperado:**\n${data.comportamento_esperado}` : "",
    data.comportamento_atual ? `\n**Comportamento atual:**\n${data.comportamento_atual}` : "",
    data.passo_a_passo ? `\n**Passo a passo para reproduzir:**\n${data.passo_a_passo}` : "",
    data.quando ? `\n**Quando começou:** ${data.quando}` : "",
    data.usuario ? `\n**Usuário/PDV afetado:** ${data.usuario}` : "",
    data.criterios_aceite ? `\n\n---\n## Critérios de Aceite\n${data.criterios_aceite}` : "",
    data.dod ? `\n\n## Definition of Done\n${data.dod}` : "",
  ];
  const descText = descParts.filter(Boolean).join("\n");

  const payload = {
    fields: {
      project: { key: projectKey },
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
      const jsonPart = reply.replace(/[\s\S]*CRIAR_TICKET\s*/, "").trim();
      const ticketData = extractJSON(jsonPart);
      if (!ticketData) {
        return NextResponse.json({ message: reply });
      }

      try {
        const label = messages.find(m => m.role === "system")?.content?.includes('"ISA"') ? "ISA" : "MB";
        const jira = await createJiraIssue(ticketData, label);
        return NextResponse.json({ message: `✅ Ticket **${jira.key}** criado!\n\n${jira.url}`, ticket: jira });
      } catch (err: any) {
        return NextResponse.json({ message: `❌ Erro ao criar ticket: ${err.message}` });
      }
    }

    return NextResponse.json({ message: reply });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro inesperado" },
      { status: 500 },
    );
  }
}
