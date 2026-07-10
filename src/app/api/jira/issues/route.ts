import { NextResponse } from "next/server";

const DEFAULT_JIRA_DOMAIN = "isa-meubilhete.atlassian.net";
const DEFAULT_JIRA_EMAIL = "leonardocastro.consultor@gmail.com";

function buildAuthHeader(email: string, apiToken: string) {
  const raw = `${email}:${apiToken}`;
  const base64 = Buffer.from(raw).toString("base64");
  return `Basic ${base64}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { summary, description, projectKey, issueType, labels, priority, config } = body;

    const domain = config?.domain || process.env.JIRA_DOMAIN || DEFAULT_JIRA_DOMAIN;
    const email = config?.email || process.env.JIRA_EMAIL || DEFAULT_JIRA_EMAIL;
    const apiToken = config?.apiToken || process.env.JIRA_API_TOKEN;

    if (!domain || !email || !apiToken) {
      return NextResponse.json(
        { error: "Domínio, email e token são obrigatórios" },
        { status: 400 },
      );
    }

    if (!summary || !projectKey) {
      return NextResponse.json(
        { error: "Summary e projectKey são obrigatórios" },
        { status: 400 },
      );
    }

    const authHeader = buildAuthHeader(email, apiToken);
    const baseUrl = `https://${domain}`;

    const adfDescription = description
      ? {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: description,
                },
              ],
            },
          ],
        }
      : undefined;

    const payload: Record<string, unknown> = {
      fields: {
        project: { key: projectKey },
        summary,
        issuetype: { name: issueType || "Task" },
        description: adfDescription,
        labels: labels || [],
      },
    };

    if (priority) {
      (payload.fields as Record<string, unknown>).priority = { name: priority };
    }

    const res = await fetch(`${baseUrl}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        {
          error: `Erro ao criar issue (${res.status})`,
          jiraMessage: JSON.stringify(data).slice(0, 1000),
        },
        { status: res.status },
      );
    }

    return NextResponse.json({
      id: data.id,
      key: data.key,
      self: data.self,
      browseUrl: `${baseUrl}/browse/${data.key}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
