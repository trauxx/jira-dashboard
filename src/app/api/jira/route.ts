import { NextResponse } from "next/server";

interface JiraConfigPayload {
  domain?: string;
  email?: string;
  apiToken?: string;
  boardId?: string;
}

function buildAuthHeader(email: string, apiToken: string) {
  const raw = `${email}:${apiToken}`;
  const base64 = Buffer.from(raw).toString("base64");
  return `Basic ${base64}`;
}

export async function POST(req: Request) {
  try {
    const body: JiraConfigPayload = await req.json();
    const { domain, email, apiToken, boardId } = body;

    if (!domain || !email || !apiToken || !boardId) {
      return NextResponse.json(
        { error: "Domínio, email, token e boardId são obrigatórios" },
        { status: 400 },
      );
    }

    const authHeader = buildAuthHeader(email, apiToken);
    const baseUrl = `https://${domain}`;

    const sprintRes = await fetch(
      `${baseUrl}/rest/agile/1.0/board/${boardId}/sprint?state=active`,
      {
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (!sprintRes.ok) {
      return NextResponse.json(
        { error: `Erro ao buscar sprint ativa (${sprintRes.status})` },
        { status: sprintRes.status },
      );
    }

    const sprintData = await sprintRes.json();
    const activeSprint = sprintData.values?.[0];

    let sprintName = activeSprint?.name ?? "Sem sprint ativa";
    const sprintStartDate = activeSprint?.startDate ?? null;
    let jql: string | null = activeSprint ? `sprint=${activeSprint.id}` : null;

    if (!jql) {
      const boardRes = await fetch(
        `${baseUrl}/rest/agile/1.0/board/${boardId}`,
        {
          headers: {
            Authorization: authHeader,
            Accept: "application/json",
          },
          cache: "no-store",
        },
      );

      if (boardRes.ok) {
        const boardData = await boardRes.json();
        const projectKey = boardData?.location?.projectKey;
        jql = projectKey
          ? `project=${projectKey} ORDER BY status`
          : "ORDER BY status";
      } else {
        jql = "ORDER BY status";
      }
    }

    const issuesRes = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        jql,
        maxResults: 100,
        fields: [
          "summary",
          "status",
          "assignee",
          "priority",
          "issuetype",
          "created",
        ],
      }),
    });

    if (!issuesRes.ok) {
      const issuesData = await issuesRes.json();
      console.error("Erro ao buscar issues:", issuesData);
      return NextResponse.json(
        { error: `Erro ao buscar issues (${issuesRes.status})` },
        { status: issuesRes.status },
      );
    }

    const issuesData = await issuesRes.json();

    const issues =
      issuesData.issues?.map((issue: any) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        created: issue.fields.created,
        assignee: issue.fields.assignee?.displayName,
        avatarUrl: issue.fields.assignee?.avatarUrls?.["24x24"],
        priority: issue.fields.priority?.name,
        issueType: issue.fields.issuetype?.name,
      })) ?? [];

    return NextResponse.json({ sprintName, sprintStartDate, issues });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
