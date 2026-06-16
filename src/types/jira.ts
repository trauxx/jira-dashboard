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
  description?: string;
  normalizedStatus?: ColumnStatus;
  addedAfterPlanned?: boolean;
}

// Campos opcionais: quando ausentes, o servidor usa as credenciais do ambiente
export interface JiraConfig {
  domain?: string;
  email?: string;
  apiToken?: string;
  boardId?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  name: string;
  companyId: string;
  permissions: string[];
}

export interface AuthSession {
  token: string;
  user: AuthUser;
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
