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
import { Skeleton } from "./ui/skeleton";
import { useToast } from "./ui/toast-provider";

type RecentTaskItem = TaskSummary & {
  projectId: string;
  projectName: string;
  workspaceId: string;
};

function getAuditVisual(action: string) {
  if (action.startsWith("billing.")) {
    return {
      badgeClass: "bg-amber-100 text-amber-700",
      dotClass: "bg-amber-500",
      label: "BI",
    };
  }

  if (action.startsWith("task.")) {
    return {
      badgeClass: "bg-blue-100 text-blue-700",
      dotClass: "bg-blue-500",
      label: "TK",
    };
  }

  if (action.startsWith("workspace.member")) {
    return {
      badgeClass: "bg-teal-100 text-teal-700",
      dotClass: "bg-teal-500",
      label: "TM",
    };
  }

  if (action.startsWith("workspace.")) {
    return {
      badgeClass: "bg-slate-200 text-slate-700",
      dotClass: "bg-slate-500",
      label: "WS",
    };
  }

  if (action.startsWith("project.")) {
    return {
      badgeClass: "bg-violet-100 text-violet-700",
      dotClass: "bg-violet-500",
      label: "PR",
    };
  }

  return {
    badgeClass: "bg-slate-100 text-slate-700",
    dotClass: "bg-slate-500",
    label: "EV",
  };
}

export function DashboardShell() {
  const router = useRouter();
  const { showToast } = useToast();
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
  const completedTaskCount = useMemo(
    () => Math.max(workspaceTaskCount - workspaceActiveTaskCount, 0),
    [workspaceActiveTaskCount, workspaceTaskCount],
  );
  const progressPercent = workspaceTaskCount
    ? Math.round((completedTaskCount / workspaceTaskCount) * 100)
    : 0;

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
          avatarUrl: me.user.avatarUrl ?? null,
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

  useEffect(() => {
    if (workspaceActionMessage) {
      showToast(workspaceActionMessage, "success");
    }
  }, [showToast, workspaceActionMessage]);

  useEffect(() => {
    if (errorMessage) {
      showToast(errorMessage, "error");
    }
  }, [errorMessage, showToast]);

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
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(42,157,143,0.14),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(244,162,97,0.14),_transparent_30%),linear-gradient(180deg,_#eddcbf_0%,_#dcc39a_100%)] px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-[1560px]">
          <div className="rounded-[2.7rem] border border-[#b99563] bg-[#e2c28f] p-4 shadow-[0_44px_124px_rgba(15,23,42,0.16)] xl:p-5">
            <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
              <div className="flex min-h-[calc(100vh-7rem)] flex-col rounded-[2rem] border border-slate-800 bg-[linear-gradient(180deg,_#151d31_0%,_#101725_100%)] p-3 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
                <div className="rounded-[1.35rem] px-3 py-4">
                  <Skeleton className="h-10 w-40 rounded-2xl" />
                </div>
                <div className="mt-2 rounded-[1.6rem] border border-white/8 bg-white/4 p-3">
                  <Skeleton className="h-4 w-24 rounded-full" />
                  <div className="mt-4 space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton className="h-20 rounded-[1.2rem]" key={index} />
                    ))}
                  </div>
                  <Skeleton className="mt-5 h-12 rounded-2xl" />
                  <Skeleton className="mt-3 h-11 rounded-full" />
                </div>
                <div className="mt-auto rounded-[1.75rem] border border-white/8 bg-white/4 p-4">
                  <Skeleton className="h-16 rounded-[1.4rem]" />
                  <Skeleton className="mt-4 h-11 rounded-full" />
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-[2.25rem] border border-[#b99563] bg-[#fff1dc] p-6 shadow-[0_30px_84px_rgba(15,23,42,0.14)]">
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_340px]">
                    <div className="tf-hero rounded-[2rem] p-6 shadow-sm">
                      <Skeleton className="h-4 w-32 rounded-full" />
                      <Skeleton className="mt-5 h-12 w-[min(32rem,85%)] rounded-2xl" />
                      <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div className="rounded-[1.5rem] border border-[#d3b488] bg-[#fff1dc] p-4 shadow-[0_14px_28px_rgba(15,23,42,0.08)]" key={index}>
                            <Skeleton className="h-3 w-20 rounded-full" />
                            <Skeleton className="mt-4 h-8 w-16 rounded-xl" />
                            <Skeleton className="mt-3 h-3 w-28 rounded-full" />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[2rem] border border-slate-800 bg-slate-900 p-6">
                      <Skeleton className="h-4 w-24 rounded-full" />
                      <Skeleton className="mt-5 h-10 w-48 rounded-2xl" />
                      <div className="mt-6 space-y-3">
                        <Skeleton className="h-11 rounded-full" />
                        <Skeleton className="h-11 rounded-full" />
                        <Skeleton className="h-11 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
                <Skeleton className="h-64 rounded-[2rem]" />
                <div className="grid gap-6 xl:grid-cols-2">
                  <Skeleton className="h-72 rounded-[2rem]" />
                  <Skeleton className="h-72 rounded-[2rem]" />
                </div>
                <Skeleton className="h-72 rounded-[2rem]" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(42,157,143,0.14),_transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(244,162,97,0.14),_transparent_26%),linear-gradient(180deg,_#eddcbf_0%,_#dcc39a_100%)] px-6 py-8 text-slate-900 sm:px-8">
      <section className="mx-auto max-w-[1500px]">
        <div className="rounded-[2.5rem] border border-[#b99563] bg-[#e2c28f] p-4 shadow-[0_44px_124px_rgba(15,23,42,0.16)] xl:p-4">
          <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
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

            <div className="space-y-4">
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
                <div className="rounded-2xl border border-[#e76f51]/25 bg-[#fff0eb] px-5 py-4 text-sm text-[#a13f24]">
                  {errorMessage}
                </div>
              ) : null}

            <section className="rounded-[2rem] border border-[#b99563] bg-[#eed4a8] p-5 shadow-[0_30px_84px_rgba(15,23,42,0.14)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
                    This page is for orientation only: current workspace state, project entry
                    points, recent movement, and a short audit trail.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {selectedWorkspace ? (
                    <Link
                      className="tf-btn-primary no-underline"
                      href={`/workspaces/${selectedWorkspace.id}`}
                    >
                      Open workspace
                    </Link>
                  ) : null}
                  {spotlightProject ? (
                    <Link
                      className="tf-btn-secondary no-underline"
                      href={`/projects/${spotlightProject.id}?workspaceId=${selectedWorkspaceId}`}
                    >
                      Open active project
                    </Link>
                  ) : null}
                  {!selectedWorkspace ? (
                    <span className="rounded-full border-2 border-slate-300 bg-white px-4 py-2 text-sm text-slate-600">
                      Create a workspace from the rail to unlock the rest of the app.
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.45rem] border border-[#b58e5f] bg-[#e8c892] p-4 shadow-[0_18px_36px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
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
                <div className="rounded-[1.45rem] border border-[#aeb9d1] bg-[#fffdf7] p-4 shadow-[0_18px_36px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
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
                <div className="rounded-[1.45rem] border border-[#90a6cc] bg-[#dfe8fb] p-4 shadow-[0_18px_36px_rgba(37,99,235,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    Recent movement
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{recentTasks.length}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Recent tasks surfaced from the selected workspace.
                  </p>
                </div>
                <div className="rounded-[1.45rem] border border-[#79ae9e] bg-[#cfe6df] p-4 shadow-[0_18px_36px_rgba(42,157,143,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Delivery progress
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{progressPercent}%</p>
                  <div className="mt-4 h-2.5 rounded-full bg-slate-100">
                    <div
                      className="h-2.5 rounded-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {completedTaskCount} of {workspaceTaskCount} workspace tasks completed.
                  </p>
                </div>
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <section className="rounded-[1.95rem] border border-[#b99563] bg-[#fff1dc] p-5 shadow-[0_26px_76px_rgba(15,23,42,0.14)]">
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
                      className="tf-btn-secondary px-4 py-2 no-underline"
                      href={`/workspaces/${selectedWorkspace.id}`}
                    >
                      View workspace
                    </Link>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3">
                  {projects.length > 0 ? (
                    projects.slice(0, 4).map((project) => (
                      <Link
                        className="rounded-[1.5rem] border border-[#b58e5f] bg-[#fff1dc] p-4 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-[#9f7a4f] hover:shadow-lg"
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
                          <span className="rounded-full bg-blue-600 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white">
                            Open
                          </span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="tf-empty-state rounded-[1.5rem] px-5 py-8 text-center text-sm text-slate-600">
                      <p className="text-lg font-semibold text-slate-900">No projects yet</p>
                      <p className="mt-2">
                        Open the workspace page to create the first delivery lane for this team.
                      </p>
                      {selectedWorkspace ? (
                        <Link className="tf-btn-primary mt-4" href={`/workspaces/${selectedWorkspace.id}`}>
                          Create project
                        </Link>
                      ) : null}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[1.95rem] border border-[#99afd3] bg-[#e6eefc] p-5 shadow-[0_26px_76px_rgba(15,23,42,0.14)]">
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

                <div className="mt-4 grid gap-3">
                  {recentTasks.length > 0 ? (
                    recentTasks.map((task) => (
                      <Link
                        className="rounded-[1.5rem] border border-[#9db7db] bg-[#dfe8fb] p-4 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-[#87a0c7] hover:shadow-lg"
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
                    <div className="tf-empty-state rounded-[1.5rem] px-5 py-8 text-center text-sm text-slate-600">
                      <p className="text-lg font-semibold text-slate-900">No recent movement</p>
                      <p className="mt-2">
                        Once tasks start moving across project boards, this feed will surface the latest work.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-[1.95rem] border border-[#adb8c9] bg-[#eef2f8] p-5 shadow-[0_26px_76px_rgba(15,23,42,0.14)]">
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
                    className="tf-btn-secondary px-4 py-2 no-underline"
                    href={`/workspaces/${selectedWorkspace.id}`}
                  >
                    Manage workspace
                  </Link>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => {
                    const visual = getAuditVisual(log.action);

                    return (
                      <div
                        className="rounded-[1.35rem] border border-[#aeb9c9] bg-[#e6edf7] p-4 shadow-[0_14px_28px_rgba(15,23,42,0.10)]"
                        key={log.id}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[11px] font-semibold tracking-[0.18em] ${visual.badgeClass}`}
                            >
                              {visual.label}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {formatAuditAction(log.action)}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${visual.dotClass}`} />
                                <p className="truncate text-[11px] uppercase tracking-[0.2em] text-slate-500">
                                  {log.entityType}
                                </p>
                              </div>
                              <p className="mt-2 truncate text-sm text-slate-600">
                                {log.actor?.name ?? "System"}
                              </p>
                            </div>
                          </div>
                          <p className="shrink-0 text-xs text-slate-500">
                            {new Date(log.createdAt).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="tf-empty-state rounded-[1.5rem] px-5 py-8 text-center text-sm text-slate-600">
                    <p className="text-lg font-semibold text-slate-900">No recent activity</p>
                    <p className="mt-2">
                      Member, project, and task changes will appear here as the workspace starts moving.
                    </p>
                  </div>
                )}
              </div>
            </section>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
