export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  status: string;
  created?: string;
  storyPoints?: number | null;
  assignee?: string;
  avatarUrl?: string;
  priority?: string;
  issueType?: string;
  browseUrl?: string;
  self?: string;
  selfUrl?: string;
  labels?: string[];
  normalizedStatus?: ColumnStatus;
  addedAfterPlanned?: boolean;
}

export interface JiraConfig {
  domain: string;
  email: string;
  apiToken: string;
  boardId: string;
}

export interface SprintInfo {
  id: number;
  name: string;
  state: string;
  startDate?: string | null;
  endDate?: string | null;
}

export type ColumnStatus = "planned" | "todo" | "inprogress" | "done";

export interface BoardColumn {
  id: ColumnStatus;
  title: string;
  statuses: string[];
  issues: JiraIssue[];
}

export interface SprintMeta {
  name: string;
  startDate?: string | null;
  endDate?: string | null;
}
