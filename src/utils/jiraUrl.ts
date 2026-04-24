import { JiraIssue } from "@/types/jira";

interface JiraUrlOptions {
  domain?: string;
  self?: string;
  selfUrl?: string;
}

export function getJiraIssueUrl(
  issue: JiraIssue,
  options?: JiraUrlOptions
): string | null {
  if (options?.domain) {
    return `https://${options.domain}/browse/${issue.key}`;
  }

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("jira-config");
      if (stored) {
        const config = JSON.parse(stored);
        if (config.domain) {
          return `https://${config.domain}/browse/${issue.key}`;
        }
        if (config.JIRA_DOMAIN) {
          return `https://${config.JIRA_DOMAIN}/browse/${issue.key}`;
        }
      }
    } catch {}
  }

  const envDomain =
    process.env.NEXT_PUBLIC_JIRA_DOMAIN || process.env.NEXT_PUBLIC_JIRA_HOST;
  if (envDomain) {
    return `https://${envDomain}/browse/${issue.key}`;
  }

  if (options?.self && isFullUrl(options.self)) {
    return options.self;
  }
  if (issue.self && isFullUrl(issue.self)) {
    return issue.self;
  }
  if (options?.selfUrl && isFullUrl(options.selfUrl)) {
    return options.selfUrl;
  }
  if (issue.selfUrl && isFullUrl(issue.selfUrl)) {
    return issue.selfUrl;
  }

  return null;
}

function isFullUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}