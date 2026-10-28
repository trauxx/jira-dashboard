import { NextResponse } from "next/server";

// Proxy serverless (AWS Lambda -> Bedrock) que não exige segredo no cliente.
// Pode ser sobrescrito por LLM_API_URL / OWU_BASE_URL.
const DEFAULT_LLM_URL =
  "https://7o75o4emgima2noql477j7eubm0twzqs.lambda-url.us-east-1.on.aws/";
const OWU_BASE_URL = (process.env.OWU_BASE_URL || "http://44.195.169.137:3000").replace(/\/+$/, "");
const OWU_MODEL = process.env.OWU_MODEL || "claude-sonnet-4";
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 120_000;
const TOKEN_TTL_MS = 30 * 60_000;
const CACHE_TTL = 300_000;

type LlmTarget = { url: string; token: string; viaSignin: boolean };

let cachedToken: { value: string; expiresAt: number } | null = null;

function timeout(ms = LLM_TIMEOUT_MS) {
  return AbortSignal.timeout(ms);
}

async function getOwuToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const email = process.env.OWU_EMAIL;
  const password = process.env.OWU_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Open WebUI sem credenciais: defina OWU_API_KEY (recomendado) ou OWU_EMAIL/OWU_PASSWORD no servidor",
    );
  }

  const res = await fetch(`${OWU_BASE_URL}/api/v1/auths/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    signal: timeout(20_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Falha ao autenticar no Open WebUI (${res.status}). Verifique OWU_EMAIL/OWU_PASSWORD ou use OWU_API_KEY. ${detail.slice(0, 200)}`,
    );
  }

  const token = (await res.json()).token;
  if (!token) throw new Error("Open WebUI não retornou token de autenticação");

  cachedToken = { value: token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return token;
}

async function resolveLlmTarget(): Promise<LlmTarget> {
  // 1) Endpoint OpenAI-compatible explícito (ex.: Open WebUI, LiteLLM).
  const explicitUrl = process.env.LLM_API_URL;
  const explicitKey = process.env.LLM_API_KEY;
  if (explicitUrl) {
    return { url: explicitUrl, token: explicitKey ?? "", viaSignin: false };
  }

  // 2) Open WebUI configurado por ambiente.
  if (process.env.OWU_API_KEY) {
    return {
      url: `${OWU_BASE_URL}/api/chat/completions`,
      token: process.env.OWU_API_KEY,
      viaSignin: false,
    };
  }
  if (process.env.OWU_BASE_URL || process.env.OWU_EMAIL) {
    return {
      url: `${OWU_BASE_URL}/api/chat/completions`,
      token: await getOwuToken(),
      viaSignin: true,
    };
  }

  // 3) Padrão: proxy Lambda -> Bedrock (autenticado por IAM, sem chave).
  return { url: DEFAULT_LLM_URL, token: "", viaSignin: false };
}

function parseSSE(body: string): string {
  let content = "";
  for (const line of body.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("data:")) continue;
    const raw = t.slice(5).trim();
    if (!raw || raw === "[DONE]") continue;
    try {
      const d = JSON.parse(raw).choices?.[0]?.delta?.content;
      if (d) content += d;
    } catch { /* chunk inválido */ }
  }
  return content.trim();
}

function extractAssistantContent(body: string): string {
  const text = body.trim();
  if (!text) return "";

  if (text.startsWith("{")) {
    try {
      const json = JSON.parse(text);
      const content =
        json?.choices?.[0]?.message?.content ??
        json?.choices?.[0]?.delta?.content ??
        json?.message?.content;
      if (typeof content === "string") return content.trim();
    } catch { /* provavelmente SSE */ }
  }

  return parseSSE(text);
}

async function requestCompletion(messages: unknown): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const target = await resolveLlmTarget();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Client": "jira-dashboard",
    };
    if (target.token) headers.Authorization = `Bearer ${target.token}`;

    const res = await fetch(target.url, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: OWU_MODEL, messages, stream: false }),
      signal: timeout(),
    });

    // Token de sessão pode ter sido invalidado: renova uma vez.
    if (res.status === 401 && target.viaSignin && attempt === 0) {
      cachedToken = null;
      continue;
    }

    return res;
  }
}

function normalize(value: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const ISSUE_TYPE_ALIASES: Record<string, string[]> = {
  bug: ["bug"],
  melhoria: ["historia", "melhoria", "story", "improvement", "funcionalidade", "feature"],
  feature: ["tarefa", "task", "historia", "story", "funcionalidade", "new feature", "demandas"],
};

type IssueType = { id?: string; name: string };

const issueTypeCache = new Map<string, { types: IssueType[]; fetchedAt: number }>();

async function getProjectIssueTypes(projectKey: string, auth: string, domain: string): Promise<IssueType[]> {
  const cached = issueTypeCache.get(projectKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.types;

  const res = await fetch(
    `https://${domain}/rest/api/3/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes?maxResults=50`,
    {
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
      signal: timeout(20_000),
    },
  );
  if (!res.ok) throw new Error(`Falha ao buscar issue types: ${res.status}`);

  const data = await res.json();
  const list: Array<{ id?: string; name?: string; subtask?: boolean }> = data.issueTypes ?? data.values ?? [];

  const types = list
    .filter((t) => t && t.name && !t.subtask)
    .map((t) => ({ id: t.id ? String(t.id) : undefined, name: String(t.name) }));

  issueTypeCache.set(projectKey, { types, fetchedAt: Date.now() });
  return types;
}

function pickIssueType(tipo: string, available: IssueType[]): IssueType {
  const aliases = ISSUE_TYPE_ALIASES[normalize(tipo)] ?? ISSUE_TYPE_ALIASES.feature;

  for (const alias of aliases) {
    const match = available.find((t) => normalize(t.name) === alias);
    if (match) return match;
  }

  // Nunca escolher Epic como fallback (o projeto usa nomes localizados em PT-BR).
  const nonEpic = available.filter((t) => normalize(t.name) !== "epic");
  return nonEpic[0] ?? available[0] ?? { name: "Tarefa" };
}

function fallbackIssueType(tipo: string): IssueType {
  return normalize(tipo) === "bug" ? { name: "Bug" } : { name: "Tarefa" };
}

function textToAdf(text: string) {
  const content: any[] = [];
  let buffer: string[] = [];

  const flushParagraph = () => {
    if (!buffer.length) return;
    const inline: any[] = [];
    buffer.forEach((line, i) => {
      if (i > 0) inline.push({ type: "hardBreak" });
      if (line.length) inline.push({ type: "text", text: line });
    });
    if (inline.length) content.push({ type: "paragraph", content: inline });
    buffer = [];
  };

  for (const line of text.split(/\r?\n/)) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      content.push({
        type: "heading",
        attrs: { level: Math.min(heading[1].length, 6) },
        content: [{ type: "text", text: heading[2] }],
      });
      continue;
    }

    if (/^\s*-{3,}\s*$/.test(line)) {
      flushParagraph();
      content.push({ type: "rule" });
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    buffer.push(line);
  }
  flushParagraph();

  return {
    type: "doc",
    version: 1,
    content: content.length ? content : [{ type: "paragraph", content: [{ type: "text", text: " " }] }],
  };
}

async function createJiraIssue(data: Record<string, string>, projectKey: string) {
  const domain = process.env.JIRA_DOMAIN || "traux.atlassian.net";
  const email = process.env.JIRA_EMAIL || "leonardocastro.consultor@gmail.com";
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!apiToken) throw new Error("JIRA_API_TOKEN não configurado no servidor");

  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");

  let issueType: IssueType;
  try {
    const availableTypes = await getProjectIssueTypes(projectKey, auth, domain);
    issueType = pickIssueType(data.tipo || "", availableTypes);
  } catch {
    issueType = fallbackIssueType(data.tipo || "");
  }

  const priorityName =
    data.prioridade === "Crítica" || data.prioridade === "Alta" ? "High"
      : data.prioridade === "Média" ? "Medium" : "Low";

  const descText = [
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
  ]
    .filter(Boolean)
    .join("\n");

  const payload = {
    fields: {
      project: { key: projectKey },
      summary: data.summary?.slice(0, 255) || "Sem título",
      issuetype: issueType.id ? { id: issueType.id } : { name: issueType.name },
      description: textToAdf(descText),
      labels: [projectKey],
      priority: { name: priorityName },
    },
  };

  const res = await fetch(`https://${domain}/rest/api/3/issue`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: timeout(30_000),
  });

  const result = await res.json();
  if (!res.ok) throw new Error(`Jira ${res.status}: ${JSON.stringify(result).slice(0, 500)}`);

  return {
    key: result.key,
    url: `https://${domain}/browse/${result.key}`,
  };
}

function extractJSON(text: string): Record<string, string> | null {
  const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  const candidates = [
    fenced?.[1],
    text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1),
    text,
  ].filter((c): c is string => Boolean(c && c.trim()));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed;
    } catch { /* tenta o próximo */ }
  }
  return null;
}

function resolveProjectKey(company: unknown, systemContent: string): string {
  const explicit = String(company ?? "").toUpperCase();
  if (explicit === "ISA" || explicit === "MB") return explicit;

  const fromPrompt = systemContent.match(/label do ticket será\s*"([^"]+)"/i)?.[1]?.toUpperCase();
  return fromPrompt === "ISA" ? "ISA" : "MB";
}

export async function POST(req: Request) {
  try {
    const { messages, company } = await req.json();
    if (!Array.isArray(messages) || !messages.length) {
      return NextResponse.json({ error: "Mensagens são obrigatórias" }, { status: 400 });
    }

    const res = await requestCompletion(messages);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Erro do provedor de IA (${res.status})`, detail: errText.slice(0, 500) },
        { status: res.status },
      );
    }

    const reply = extractAssistantContent(await res.text());
    if (!reply) {
      return NextResponse.json({ error: "Resposta vazia do provedor de IA" }, { status: 502 });
    }

    if (reply.includes("CRIAR_TICKET")) {
      const jsonPart = reply.replace(/[\s\S]*CRIAR_TICKET\s*/, "").trim();
      const ticketData = extractJSON(jsonPart);
      if (!ticketData) {
        return NextResponse.json({
          message: "❌ Não consegui interpretar os dados do ticket. Pode confirmar ou reformular as informações?",
        });
      }

      const systemContent = messages.find((m: { role?: string }) => m.role === "system")?.content ?? "";
      const projectKey = resolveProjectKey(company, String(systemContent));

      try {
        const jira = await createJiraIssue(ticketData, projectKey);
        return NextResponse.json({
          message: `✅ Ticket **${jira.key}** criado!\n\n${jira.url}`,
          ticket: jira,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "erro desconhecido";
        // Evita vazar o marcador interno para o usuário.
        return NextResponse.json({ message: `❌ Erro ao criar ticket: ${message}` });
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
