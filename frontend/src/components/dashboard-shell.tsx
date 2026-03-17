"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequestWithToken } from "@/lib/api";
import {
  clearAuthSession,
  getAccessToken,
  getStoredUser,
  type AuthUser,
} from "@/lib/auth-storage";
import { InvitationsPanel } from "./invitations-panel";

type WorkspaceSummary = {
  id: string;
  name: string;
  members: Array<{ role: string }>;
};

type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  creator: AuthUser;
};

type TaskSummary = {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: AuthUser | null;
};

type TasksResponse = {
  items: TaskSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";

type AuthMeResponse = {
  user: {
    sub: string;
    email: string;
    name: string;
  };
};

export function DashboardShell() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [currentWorkspaceRole, setCurrentWorkspaceRole] = useState<WorkspaceRole | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    const storedUser = getStoredUser();

    if (!token) {
      router.replace("/login");
      return;
    }

    const accessToken = token;

    if (storedUser) {
      setUser(storedUser);
    }

    let cancelled = false;

    async function loadDashboard() {
      try {
        const me = await apiRequestWithToken<AuthMeResponse>(
          "/auth/me",
          accessToken,
        );

        if (!cancelled) {
          setUser({
            id: me.user.sub,
            name: me.user.name,
            email: me.user.email,
          });
        }

        const workspaceItems = await apiRequestWithToken<WorkspaceSummary[]>(
          "/workspaces",
          accessToken,
        );

        if (cancelled) {
          return;
        }

        setWorkspaces(workspaceItems);

        const firstWorkspace = workspaceItems[0];
        if (!firstWorkspace) {
          setCurrentWorkspaceRole(null);
          setProjects([]);
          setTasks([]);
          return;
        }

        setCurrentWorkspaceRole(
          (firstWorkspace.members[0]?.role as WorkspaceRole | undefined) ?? null,
        );

        const projectItems = await apiRequestWithToken<ProjectSummary[]>(
          `/workspaces/${firstWorkspace.id}/projects`,
          accessToken,
        );

        if (cancelled) {
          return;
        }

        setProjects(projectItems);

        const firstProject = projectItems[0];
        if (!firstProject) {
          setTasks([]);
          return;
        }

        const taskItems = await apiRequestWithToken<TasksResponse>(
          `/workspaces/${firstWorkspace.id}/projects/${firstProject.id}/tasks`,
          accessToken,
        );

        if (!cancelled) {
          setTasks(taskItems.items);
        }
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

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function handleLogout() {
    clearAuthSession();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,_#f7f1e7_0%,_#efe7d8_100%)] px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-slate-500">
            Dashboard
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Loading your workspace data...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(33,158,188,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(244,162,97,0.24),_transparent_30%),linear-gradient(180deg,_#f7f1e7_0%,_#efe7d8_100%)] px-6 py-8 text-slate-900 sm:px-8">
      <section className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-slate-900/10 bg-white/72 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.09)] backdrop-blur sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-slate-500">
              TeamFlow Dashboard
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              {user ? `Welcome back, ${user.name}.` : "Welcome back."}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              This dashboard uses your stored JWT to load live backend data for
              workspaces, projects, and tasks.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              href="/"
            >
              Landing page
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-[#e7f3f0] px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-[#d9ece7]"
              href="/settings/billing"
            >
              Billing
            </Link>
            <button
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
              onClick={handleLogout}
              type="button"
            >
              Log out
            </button>
          </div>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-[#e76f51]/25 bg-[#fff0eb] px-5 py-4 text-sm text-[#a13f24]">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-900/10 bg-white/72 p-6 backdrop-blur">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                Workspaces
              </p>
              <div className="mt-4 space-y-3">
                {workspaces.length > 0 ? (
                  workspaces.map((workspace) => (
                    <div
                      className="rounded-2xl border border-slate-900/10 bg-[#f7efe2] p-4"
                      key={workspace.id}
                    >
                      <p className="text-base font-semibold text-slate-900">
                        {workspace.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Your role: {workspace.members[0]?.role ?? "UNKNOWN"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">
                    No workspaces yet. Create one through Swagger or the next
                    frontend workspace flow.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-900/10 bg-white/72 p-6 backdrop-blur">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                Current user
              </p>
              <div className="mt-4 rounded-2xl bg-slate-900 p-5 text-slate-50">
                <p className="text-lg font-semibold">{user?.name ?? "Unknown user"}</p>
                <p className="mt-1 text-sm text-slate-300">{user?.email}</p>
              </div>
            </section>

            <InvitationsPanel
              canManage={
                currentWorkspaceRole === "OWNER" || currentWorkspaceRole === "ADMIN"
              }
              token={getAccessToken()}
              workspaceId={workspaces[0]?.id ?? null}
            />
          </div>

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-900/10 bg-white/72 p-6 backdrop-blur">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                Projects
              </p>
              <div className="mt-4 grid gap-3">
                {projects.length > 0 ? (
                  projects.map((project) => (
                    <div
                      className="rounded-2xl border border-slate-900/10 bg-[#e7f3f0] p-4"
                      key={project.id}
                    >
                      <p className="text-base font-semibold text-slate-900">
                        {project.name}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {project.description || "No description yet."}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">
                    No projects available in your first workspace yet.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-900/10 bg-white/72 p-6 backdrop-blur">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                Tasks
              </p>
              <div className="mt-4 grid gap-3">
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <div
                      className="rounded-2xl border border-slate-900/10 bg-white p-4"
                      key={task.id}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-base font-semibold text-slate-900">
                            {task.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            Status: {task.status} · Priority: {task.priority}
                          </p>
                        </div>
                        <div className="rounded-full bg-slate-900 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-white">
                          {task.assignee ? task.assignee.name : "Unassigned"}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">
                    No tasks available in your first project yet.
                  </p>
                )}
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}
