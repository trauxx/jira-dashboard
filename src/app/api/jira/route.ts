import { NextResponse } from "next/server";
import { getApiConfig } from "@/lib/apiConfig";

interface JiraConfigPayload {
  domain?: string;
  email?: string;
  apiToken?: string;
  boardId?: string;
  sprintId?: number | string;
}

const DEFAULT_JIRA_DOMAIN = "traux.atlassian.net";
const DEFAULT_JIRA_EMAIL = "leonardocastro.consultor@gmail.com";

function buildAuthHeader(email: string, apiToken: string) {
  const raw = `${email}:${apiToken}`;
  const base64 = Buffer.from(raw).toString("base64");
  return `Basic ${base64}`;
}

// A descrição do Jira (API v3) vem em Atlassian Document Format (ADF).
// Achata recursivamente para texto puro, preservando quebras de parágrafo.
function adfToText(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;

  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";

  const children = Array.isArray(node.content)
    ? node.content.map(adfToText).join("")
    : "";

  const blockTypes = ["paragraph", "heading", "listItem", "blockquote"];
  if (blockTypes.includes(node.type)) return `${children}\n`;
  if (node.type === "bulletList" || node.type === "orderedList") {
    return children;
  }

  return children;
}

export async function POST(req: Request) {
  try {
    const body: JiraConfigPayload = await req.json();
    const { sprintId } = body;

    // boardId e projectKey resolvidos pelo domínio (x-forwarded-host na Vercel)
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const { boardId, projectKey } = getApiConfig(host);

    const domain =
      body.domain || process.env.JIRA_DOMAIN || DEFAULT_JIRA_DOMAIN;
    const email = body.email || process.env.JIRA_EMAIL || DEFAULT_JIRA_EMAIL;
    const apiToken = body.apiToken || process.env.JIRA_API_TOKEN;

    if (!domain || !email || !apiToken || !boardId) {
      return NextResponse.json(
        { error: "Domínio, email, token e boardId são obrigatórios" },
        { status: 400 },
      );
    }

    const authHeader = buildAuthHeader(email, apiToken);
    const baseUrl = `https://${domain}`;

    const requestedSprintId =
      sprintId !== undefined && sprintId !== null && sprintId !== ""
        ? Number(sprintId)
        : null;
    const validRequestedSprintId =
      requestedSprintId !== null && Number.isFinite(requestedSprintId)
        ? requestedSprintId
        : null;

    const sprintRes = await fetch(
      `${baseUrl}/rest/agile/1.0/board/${boardId}/sprint?state=active,future,closed&maxResults=50`,
      {
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (!sprintRes.ok) {
      const jiraBody = await sprintRes.text().catch(() => "");
      return NextResponse.json(
        {
          error: `Erro ao buscar sprints (${sprintRes.status})`,
          jiraMessage: jiraBody.slice(0, 500),
          debug: {
            domain,
            email,
            boardId,
            tokenLength: apiToken.length,
            tokenSource: body.apiToken
              ? "client"
              : process.env.JIRA_API_TOKEN
                ? "env"
                : "default",
          },
        },
        { status: sprintRes.status },
      );
    }

    const sprintData = await sprintRes.json();
    const sprints =
      sprintData.values?.map((s: any) => ({
        id: s.id,
        name: s.name,
        state: s.state,
        startDate: s.startDate ?? null,
        endDate: s.endDate ?? null,
      })) ?? [];

    const activeSprint = sprints.find((s: any) => s.state === "active");
    const selectedSprint = validRequestedSprintId
      ? sprints.find((s: any) => s.id === validRequestedSprintId)
      : (activeSprint ?? sprints[0]);

    let sprintName = selectedSprint?.name ?? "Sem sprint ativa";
    const sprintStartDate = selectedSprint?.startDate ?? null;
    const sprintEndDate = selectedSprint?.endDate ?? null;
    const selectedSprintId = selectedSprint?.id ?? null;
    let jql: string | null = selectedSprint
      ? `sprint=${selectedSprint.id}`
      : null;

    if (!jql) {
      jql = `project=${projectKey} ORDER BY status`;
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
          "labels",
          "description",
          "customfield_10016",
          "customfield_10026",
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
        browseUrl: `${baseUrl}/browse/${issue.key}`,
        labels: issue.fields.labels ?? [],
        description: issue.fields.description
          ? adfToText(issue.fields.description).trim()
          : "",
        storyPoints:
          issue.fields.customfield_10016 ?? // padrão cloud
          issue.fields.customfield_10026 ?? // alternativo comum
          null,
      })) ?? [];

    return NextResponse.json({
      sprintName,
      sprintStartDate,
      sprintEndDate,
      selectedSprintId,
      sprints,
      issues,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
