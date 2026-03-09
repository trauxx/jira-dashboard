export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  status: string;
  created?: string;
  assignee?: string;
  avatarUrl?: string;
  priority?: string;
  issueType?: string;
}

export interface JiraConfig {
  domain: string;
  email: string;
  apiToken: string;
  boardId: string;
}

export type ColumnStatus = "planned" | "todo" | "inprogress" | "done";

export interface BoardColumn {
  id: ColumnStatus;
  title: string;
  statuses: string[];
  issues: JiraIssue[];
}
