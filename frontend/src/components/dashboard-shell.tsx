"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequestWithToken } from "@/lib/api";
import {
  clearAuthSession,
  getAccessToken,
  getStoredUser,
  type AuthUser,
} from "@/lib/auth-storage";
import { DashboardHeader } from "./dashboard/dashboard-header";
import { WorkspaceSidebar } from "./dashboard/workspace-sidebar";
import type {
  AuditLogSummary,
  AuthMeResponse,
  ProjectSummary,
  TasksResponse,
  TaskSummary,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceSummary,
} from "./dashboard/types";
import { formatAuditAction, formatStatus } from "./dashboard/utils";

type RecentTaskItem = TaskSummary & {
  projectId: string;
  projectName: string;
  workspaceId: string;
};

export function DashboardShell() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [selectedWorkspaceRole, setSelectedWorkspaceRole] = useState<WorkspaceRole | null>(
    null,
  );
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTaskItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogSummary[]>([]);
  const [workspaceTaskCount, setWorkspaceTaskCount] = useState(0);
  const [workspaceActiveTaskCount, setWorkspaceActiveTaskCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [workspaceActionMessage, setWorkspaceActionMessage] = useState<string | null>(null);

  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null;

  const spotlightProject = useMemo(() => projects[0] ?? null, [projects]);

  useEffect(() => {
    const accessToken = getAccessToken();
    const storedUser = getStoredUser();

    if (!accessToken) {
      router.replace("/login");
      return;
    }

    const sessionToken = accessToken;

    setToken(sessionToken);
    if (storedUser) {
      setUser(storedUser);
    }

    let cancelled = false;

    async function loadInitialDashboard() {
      try {
        const me = await apiRequestWithToken<AuthMeResponse>("/auth/me", sessionToken);

        if (cancelled) {
          return;
        }

        setUser({
          id: me.user.sub,
          name: me.user.name,
          email: me.user.email,
        });

        const workspaceItems = await apiRequestWithToken<WorkspaceSummary[]>(
          "/workspaces",
          sessionToken,
        );

        if (cancelled) {
          return;
        }

        setWorkspaces(workspaceItems);

        if (workspaceItems.length === 0) {
          setSelectedWorkspaceId(null);
          setSelectedWorkspaceRole(null);
          setWorkspaceMembers([]);
          setProjects([]);
          setRecentTasks([]);
          setAuditLogs([]);
          setWorkspaceTaskCount(0);
          setWorkspaceActiveTaskCount(0);
          return;
        }

        const firstWorkspace = workspaceItems[0];
        setSelectedWorkspaceId(firstWorkspace.id);
        setSelectedWorkspaceRole(firstWorkspace.members[0]?.role ?? null);
      } catch (error) {
        clearAuthSession();
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to load dashboard.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialDashboard();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!token || !selectedWorkspaceId) {
      return;
    }

    const sessionToken = token;
    let cancelled = false;
    setWorkspaceLoading(true);
    setErrorMessage(null);

    async function loadWorkspaceOverview() {
      try {
        const workspaceId = selectedWorkspaceId;

        if (!workspaceId) {
          return;
        }

        const [membersResponse, projectsResponse, auditResponse] = await Promise.all([
          apiRequestWithToken<WorkspaceMember[]>(
            `/workspaces/${workspaceId}/members`,
            sessionToken,
          ),
          apiRequestWithToken<ProjectSummary[]>(
            `/workspaces/${workspaceId}/projects`,
            sessionToken,
          ),
          apiRequestWithToken<AuditLogSummary[]>(
            `/workspaces/${workspaceId}/audit-logs`,
            sessionToken,
          ),
        ]);

        const taskCollections = await Promise.all(
          projectsResponse.slice(0, 6).map(async (project) => {
            const taskResponse = await apiRequestWithToken<TasksResponse>(
              `/workspaces/${workspaceId}/projects/${project.id}/tasks?page=1&pageSize=12`,
              sessionToken,
            );

            return taskResponse.items.map<RecentTaskItem>((task) => ({
              ...task,
              projectId: project.id,
              projectName: project.name,
              workspaceId,
            }));
          }),
        );

        if (cancelled) {
          return;
        }

        const flattenedTasks = taskCollections.flat();

        setWorkspaceMembers(membersResponse);
        setProjects(projectsResponse);
        setAuditLogs(auditResponse.slice(0, 6));
        setWorkspaceTaskCount(flattenedTasks.length);
        setWorkspaceActiveTaskCount(
          flattenedTasks.filter((task) => task.status !== "DONE").length,
        );
        setRecentTasks(
          flattenedTasks
            .sort((left, right) => {
              const leftDate = left.createdAt ? Date.parse(left.createdAt) : 0;
              const rightDate = right.createdAt ? Date.parse(right.createdAt) : 0;
              return rightDate - leftDate;
            })
            .slice(0, 6),
        );

        const workspace = workspaces.find((item) => item.id === workspaceId);
        setSelectedWorkspaceRole(workspace?.members[0]?.role ?? null);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Failed to load workspace overview.",
          );
        }
      } finally {
        if (!cancelled) {
          setWorkspaceLoading(false);
        }
      }
    }

    void loadWorkspaceOverview();

    return () => {
      cancelled = true;
    };
  }, [selectedWorkspaceId, token, workspaces]);

  async function reloadWorkspaceList() {
    if (!token) {
      return [];
    }

    const workspaceItems = await apiRequestWithToken<WorkspaceSummary[]>(
      "/workspaces",
      token,
    );
    setWorkspaces(workspaceItems);
    return workspaceItems;
  }

  async function handleCreateWorkspace(name: string) {
    if (!token) {
      return;
    }

    setWorkspaceLoading(true);
    setErrorMessage(null);
    setWorkspaceActionMessage(null);

    try {
      const workspace = await apiRequestWithToken<WorkspaceSummary>(
        "/workspaces",
        token,
        {
          method: "POST",
          body: JSON.stringify({ name }),
        },
      );

      await reloadWorkspaceList();
      setSelectedWorkspaceId(workspace.id);
      setWorkspaceActionMessage(`Workspace "${workspace.name}" created.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create workspace.",
      );
    } finally {
      setWorkspaceLoading(false);
    }
  }

  function handleWorkspaceChange(workspaceId: string) {
    setSelectedWorkspaceId(workspaceId);
    setWorkspaceActionMessage(null);
  }

  function handleLogout() {
    clearAuthSession();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(42,157,143,0.14),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(244,162,97,0.14),_transparent_30%),linear-gradient(180deg,_#f8f3ea_0%,_#efe4d3_100%)] px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-slate-500">
            Dashboard
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Loading the operating overview...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(42,157,143,0.14),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(244,162,97,0.14),_transparent_30%),linear-gradient(180deg,_#f8f3ea_0%,_#efe4d3_100%)] px-6 py-8 text-slate-900 sm:px-8">
      <section className="mx-auto max-w-7xl">
        <DashboardHeader
          activeTaskCount={workspaceActiveTaskCount}
          activeWorkspaceName={selectedWorkspace?.name ?? null}
          memberCount={workspaceMembers.length}
          onLogout={handleLogout}
          projectCount={projects.length}
          selectedWorkspaceRole={selectedWorkspaceRole}
          taskCount={workspaceTaskCount}
          user={user}
        />

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-[#e76f51]/25 bg-[#fff0eb] px-5 py-4 text-sm text-[#a13f24]">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-6 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
          <WorkspaceSidebar
            onCreateWorkspace={(name) => {
              void handleCreateWorkspace(name);
            }}
            onWorkspaceChange={handleWorkspaceChange}
            selectedWorkspaceId={selectedWorkspaceId}
            user={user}
            workspaceActionMessage={workspaceActionMessage}
            workspaceLoading={workspaceLoading}
            workspaces={workspaces}
          />

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-900/10 bg-white/80 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                    Overview
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-slate-900">
                    {selectedWorkspace
                      ? `${selectedWorkspace.name} at a glance`
                      : "Start with a workspace"}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    The overview is now meant for orientation only: current workspace status,
                    project entry points, recent task movement, and activity history.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {selectedWorkspace ? (
                    <Link
                      className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white no-underline transition hover:bg-slate-700"
                      href={`/workspaces/${selectedWorkspace.id}`}
                    >
                      Open workspace
                    </Link>
                  ) : null}
                  {spotlightProject ? (
                    <Link
                      className="inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-[#e7f3f0] px-5 py-3 text-sm font-medium text-slate-900 no-underline transition hover:bg-[#d9ece7]"
                      href={`/projects/${spotlightProject.id}?workspaceId=${selectedWorkspaceId}`}
                    >
                      Open active project
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.5rem] border border-slate-900/10 bg-[#fff7ec] p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Workspace lane
                  </p>
                  <p className="mt-3 text-lg font-semibold text-slate-900">
                    {selectedWorkspace?.name ?? "No workspace selected"}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Members, invites, and project planning now live on the workspace page.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-900/10 bg-white p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Active projects
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">
                    {projects.length}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Focused delivery lanes with separate task-board pages.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-900/10 bg-slate-900 p-5 text-slate-50">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    Recent movement
                  </p>
                  <p className="mt-3 text-3xl font-semibold">{recentTasks.length}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Recent tasks surfaced from the selected workspace.
                  </p>
                </div>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <section className="rounded-[2rem] border border-slate-900/10 bg-white/80 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                      Active projects
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold text-slate-900">
                      Delivery lanes
                    </h3>
                  </div>
                  {selectedWorkspace ? (
                    <Link
                      className="rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm font-medium text-slate-900 no-underline transition hover:bg-slate-50"
                      href={`/workspaces/${selectedWorkspace.id}`}
                    >
                      View workspace
                    </Link>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-3">
                  {projects.length > 0 ? (
                    projects.slice(0, 4).map((project) => (
                      <Link
                        className="rounded-[1.5rem] border border-slate-900/10 bg-[#fffdfa] p-4 no-underline transition hover:border-slate-900/25 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
                        href={`/projects/${project.id}?workspaceId=${selectedWorkspaceId}`}
                        key={project.id}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-base font-semibold text-slate-900">
                              {project.name}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {project.description || "No description yet."}
                            </p>
                          </div>
                          <span className="rounded-full bg-[#edf8f5] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#1f6c63]">
                            Open
                          </span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-900/15 bg-[#fffdfa] px-5 py-8 text-sm text-slate-600">
                      No projects yet. Create one from the workspace page instead of the overview.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-900/10 bg-white/80 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                      Recent tasks
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold text-slate-900">
                      What moved recently
                    </h3>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {recentTasks.length > 0 ? (
                    recentTasks.map((task) => (
                      <Link
                        className="rounded-[1.5rem] border border-slate-900/10 bg-[#fffdfa] p-4 no-underline transition hover:border-slate-900/25 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
                        href={`/projects/${task.projectId}?workspaceId=${task.workspaceId}`}
                        key={task.id}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-base font-semibold text-slate-900">
                              {task.title}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {task.projectName}
                            </p>
                          </div>
                          <span className="rounded-full bg-[#fff3e7] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#8d5b28]">
                            {formatStatus(task.status)}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {task.description || "No description yet."}
                        </p>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-900/15 bg-[#fffdfa] px-5 py-8 text-sm text-slate-600">
                      Recent tasks will appear here once projects start moving.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-[2rem] border border-slate-900/10 bg-white/80 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                    Recent activity
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-slate-900">
                    Audit trail
                  </h3>
                </div>
                {selectedWorkspace ? (
                  <Link
                    className="rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm font-medium text-slate-900 no-underline transition hover:bg-slate-50"
                    href={`/workspaces/${selectedWorkspace.id}`}
                  >
                    Manage workspace
                  </Link>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <div
                      className="rounded-[1.5rem] border border-slate-900/10 bg-[#fffdfa] p-4"
                      key={log.id}
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {formatAuditAction(log.action)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {log.actor?.name ?? "System"} on{" "}
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                        {log.entityType}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-900/15 bg-[#fffdfa] px-5 py-8 text-sm text-slate-600">
                    Activity history will appear here as the team uses the workspace.
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}
