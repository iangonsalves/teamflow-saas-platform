import type { AuthUser } from "@/lib/auth-storage";

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type WorkspaceSummary = {
  id: string;
  name: string;
  members: Array<{ role: WorkspaceRole }>;
};

export type WorkspaceDetail = {
  id: string;
  name: string;
  owner: AuthUser;
  members: WorkspaceMember[];
};

export type WorkspaceMember = {
  id: string;
  role: WorkspaceRole;
  user: AuthUser;
};

export type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  creator: AuthUser;
};

export type TaskSummary = {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: AuthUser | null;
  createdAt?: string;
};

export type TasksResponse = {
  items: TaskSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type AuthMeResponse = {
  user: {
    sub: string;
    email: string;
    name: string;
  };
};

export type AuditLogSummary = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor: AuthUser | null;
};
