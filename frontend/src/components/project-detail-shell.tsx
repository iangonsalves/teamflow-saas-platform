"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequestWithToken } from "@/lib/api";
import { clearAuthSession, getAccessToken, type AuthUser } from "@/lib/auth-storage";
import { PageBackLink } from "./page-back-link";
import { TaskBoard } from "./dashboard/task-board";
import type {
  ProjectSummary,
  TaskPriority,
  TasksResponse,
  TaskStatus,
  TaskSummary,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceSummary,
} from "./dashboard/types";
import { formatStatus } from "./dashboard/utils";

type ProjectDetailShellProps = {
  projectId: string;
};

type ResolvedProjectContext = {
  workspaceId: string;
  project: ProjectSummary;
  workspaceItems: WorkspaceSummary[];
  projectItems: ProjectSummary[];
};

export function ProjectDetailShell({ projectId }: ProjectDetailShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [resolvedWorkspaceId, setResolvedWorkspaceId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);
  const [selectedWorkspaceRole, setSelectedWorkspaceRole] = useState<WorkspaceRole | null>(
    null,
  );
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("MEDIUM");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskActionMessage, setTaskActionMessage] = useState<string | null>(null);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("MEDIUM");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canManageWorkspace =
    selectedWorkspaceRole === "OWNER" || selectedWorkspaceRole === "ADMIN";
  const workspaceHint = searchParams.get("workspaceId");

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === resolvedWorkspaceId) ?? null,
    [resolvedWorkspaceId, workspaces],
  );

  useEffect(() => {
    const accessToken = getAccessToken();

    if (!accessToken) {
      router.replace("/login");
      return;
    }

    const sessionToken = accessToken;

    setToken(sessionToken);

    let cancelled = false;

    async function resolveProjectContext(): Promise<ResolvedProjectContext | null> {
      const workspaceItems = await apiRequestWithToken<WorkspaceSummary[]>(
        "/workspaces",
        sessionToken,
      );

      if (cancelled) {
        return null;
      }

      setWorkspaces(workspaceItems);

      const candidateWorkspaceIds = [
        ...(workspaceHint ? [workspaceHint] : []),
        ...workspaceItems.map((workspace) => workspace.id).filter((id) => id !== workspaceHint),
      ];

      for (const workspaceId of candidateWorkspaceIds) {
        const projectItems = await apiRequestWithToken<ProjectSummary[]>(
          `/workspaces/${workspaceId}/projects`,
          sessionToken,
        );

        if (cancelled) {
          return null;
        }

        const match = projectItems.find((project) => project.id === projectId);

        if (match) {
          return {
            workspaceId,
            project: match,
            workspaceItems,
            projectItems,
          };
        }
      }

      return null;
    }

    async function loadProjectPage() {
      try {
        const me = await apiRequestWithToken<{ user: { sub: string; email: string; name: string } }>(
          "/auth/me",
          sessionToken,
        );

        if (!cancelled) {
          setUser({
            id: me.user.sub,
            name: me.user.name,
            email: me.user.email,
          });
        }

        const context = await resolveProjectContext();

        if (cancelled) {
          return;
        }

        if (!context) {
          throw new Error("Project not found in your workspaces.");
        }

        const [membersResponse, tasksResponse] = await Promise.all([
          apiRequestWithToken<WorkspaceMember[]>(
            `/workspaces/${context.workspaceId}/members`,
            sessionToken,
          ),
          apiRequestWithToken<TasksResponse>(
            `/workspaces/${context.workspaceId}/projects/${projectId}/tasks?page=1&pageSize=50`,
            sessionToken,
          ),
        ]);

        if (cancelled) {
          return;
        }

        setWorkspaces(context.workspaceItems);
        setProjects(context.projectItems);
        setResolvedWorkspaceId(context.workspaceId);
        setSelectedProject(context.project);
        setWorkspaceMembers(membersResponse);
        setTasks(tasksResponse.items);

        const activeWorkspaceSummary = context.workspaceItems.find(
          (workspace) => workspace.id === context.workspaceId,
        );
        setSelectedWorkspaceRole(activeWorkspaceSummary?.members[0]?.role ?? null);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to load project page.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProjectPage();

    return () => {
      cancelled = true;
    };
  }, [projectId, router, workspaceHint]);

  async function reloadProjectState() {
    if (!token || !resolvedWorkspaceId) {
      return;
    }

    const sessionToken = token;
    const [membersResponse, projectItems, tasksResponse, workspaceItems] = await Promise.all([
      apiRequestWithToken<WorkspaceMember[]>(`/workspaces/${resolvedWorkspaceId}/members`, sessionToken),
      apiRequestWithToken<ProjectSummary[]>(`/workspaces/${resolvedWorkspaceId}/projects`, sessionToken),
      apiRequestWithToken<TasksResponse>(
        `/workspaces/${resolvedWorkspaceId}/projects/${projectId}/tasks?page=1&pageSize=50`,
        sessionToken,
      ),
      apiRequestWithToken<WorkspaceSummary[]>("/workspaces", sessionToken),
    ]);

    setWorkspaceMembers(membersResponse);
    setProjects(projectItems);
    setTasks(tasksResponse.items);
    setWorkspaces(workspaceItems);
    const activeWorkspaceSummary = workspaceItems.find(
      (workspace) => workspace.id === resolvedWorkspaceId,
    );
    setSelectedWorkspaceRole(activeWorkspaceSummary?.members[0]?.role ?? null);
    setSelectedProject(projectItems.find((project) => project.id === projectId) ?? null);
  }

  async function handleCreateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !resolvedWorkspaceId || !canManageWorkspace) {
      return;
    }

    const sessionToken = token;
    setSubmittingTask(true);
    setTaskActionMessage(null);
    setErrorMessage(null);

    try {
      const createdTask = await apiRequestWithToken<TaskSummary>(
        `/workspaces/${resolvedWorkspaceId}/projects/${projectId}/tasks`,
        sessionToken,
        {
          method: "POST",
          body: JSON.stringify({
            title: taskTitle,
            description: taskDescription || undefined,
            priority: taskPriority,
            assignedTo: taskAssignee || undefined,
          }),
        },
      );

      await reloadProjectState();
      setTaskTitle("");
      setTaskDescription("");
      setTaskPriority("MEDIUM");
      setTaskAssignee("");
      setTaskActionMessage(`Task "${createdTask.title}" added to the board.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create task.",
      );
    } finally {
      setSubmittingTask(false);
    }
  }

  async function handleTaskStatusChange(taskId: string, status: TaskStatus) {
    if (!token || !resolvedWorkspaceId) {
      return;
    }

    const sessionToken = token;
    setUpdatingTaskId(taskId);
    setTaskActionMessage(null);
    setErrorMessage(null);

    try {
      const updatedTask = await apiRequestWithToken<TaskSummary>(
        `/workspaces/${resolvedWorkspaceId}/projects/${projectId}/tasks/${taskId}/status`,
        sessionToken,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
      );

      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === taskId ? updatedTask : task)),
      );
      setTaskActionMessage(
        `Task "${updatedTask.title}" moved to ${formatStatus(updatedTask.status)}.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update task status.",
      );
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function handleTaskAssigneeUpdate(taskId: string, assigneeId: string) {
    if (!token || !resolvedWorkspaceId) {
      return;
    }

    const sessionToken = token;
    setUpdatingTaskId(taskId);
    setTaskActionMessage(null);
    setErrorMessage(null);

    try {
      const updatedTask = await apiRequestWithToken<TaskSummary>(
        `/workspaces/${resolvedWorkspaceId}/projects/${projectId}/tasks/${taskId}/assignee`,
        sessionToken,
        {
          method: "PATCH",
          body: JSON.stringify({
            assignedTo: assigneeId || null,
          }),
        },
      );

      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === taskId ? updatedTask : task)),
      );
      setTaskActionMessage(
        `Task "${updatedTask.title}" assigned to ${updatedTask.assignee?.name ?? "nobody"}.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update assignee.",
      );
    } finally {
      setUpdatingTaskId(null);
    }
  }

  function handleStartEditingTask(task: TaskSummary) {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditPriority(task.priority);
    setTaskActionMessage(null);
  }

  function handleCancelEditingTask() {
    setEditingTaskId(null);
    setEditTitle("");
    setEditDescription("");
    setEditPriority("MEDIUM");
  }

  async function handleSaveTaskEdit(taskId: string) {
    if (!token || !resolvedWorkspaceId) {
      return;
    }

    const sessionToken = token;
    setUpdatingTaskId(taskId);
    setTaskActionMessage(null);
    setErrorMessage(null);

    try {
      const updatedTask = await apiRequestWithToken<TaskSummary>(
        `/workspaces/${resolvedWorkspaceId}/projects/${projectId}/tasks/${taskId}`,
        sessionToken,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: editTitle,
            description: editDescription,
            priority: editPriority,
          }),
        },
      );

      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === taskId ? updatedTask : task)),
      );
      setTaskActionMessage(`Task "${updatedTask.title}" updated.`);
      handleCancelEditingTask();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update task details.",
      );
    } finally {
      setUpdatingTaskId(null);
    }
  }

  function handleLogout() {
    clearAuthSession();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(42,157,143,0.14),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(244,162,97,0.14),_transparent_30%),linear-gradient(180deg,_#f8f3ea_0%,_#efe4d3_100%)] px-6 py-8 text-slate-900 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-slate-500">
            Project
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Loading project board...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(42,157,143,0.14),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(244,162,97,0.14),_transparent_30%),linear-gradient(180deg,_#f8f3ea_0%,_#efe4d3_100%)] px-6 py-8 text-slate-900 sm:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6">
          <PageBackLink
            href={resolvedWorkspaceId ? `/workspaces/${resolvedWorkspaceId}` : "/dashboard"}
            label={resolvedWorkspaceId ? "Back to workspace" : "Back to overview"}
          />
        </div>

        <header className="rounded-[2rem] border border-slate-900/10 bg-white/78 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.09)] backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="font-mono text-xs uppercase tracking-[0.32em] text-slate-500">
                Project detail
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                {selectedProject?.name ?? "Project"}
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600">
                The task board lives here now, with more space for status movement, editing, and assignment.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-white px-5 py-3 text-sm font-medium text-slate-900 no-underline transition hover:bg-slate-50"
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
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-[#f8f2e6] p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Workspace
              </p>
              <p className="mt-3 text-lg font-semibold text-slate-900">
                {activeWorkspace?.name ?? "Unknown"}
              </p>
              <p className="mt-1 text-sm text-slate-600">Operational context</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-white p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Tasks
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{tasks.length}</p>
              <p className="mt-1 text-sm text-slate-600">Cards on this board</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-white p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Team
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{workspaceMembers.length}</p>
              <p className="mt-1 text-sm text-slate-600">Members available to assign</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-slate-900 p-4 text-slate-50">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-400">
                Your role
              </p>
              <p className="mt-3 text-lg font-semibold">
                {selectedWorkspaceRole ?? "MEMBER"}
              </p>
              <p className="mt-1 text-sm text-slate-300">{user?.email ?? "Signed in"}</p>
            </div>
          </div>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-[#e76f51]/25 bg-[#fff0eb] px-5 py-4 text-sm text-[#a13f24]">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-6 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-slate-900/10 bg-white/78 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                Workspace projects
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Jump between projects without returning to the crowded dashboard.
              </p>
              <div className="mt-4 grid gap-3">
                {projects.map((project) => (
                  <Link
                    className={`rounded-[1.25rem] border px-4 py-4 text-sm no-underline transition ${
                      project.id === projectId
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-900/10 bg-[#fffdfa] text-slate-900 hover:border-slate-900/25"
                    }`}
                    href={`/projects/${project.id}?workspaceId=${resolvedWorkspaceId}`}
                    key={project.id}
                  >
                    <p className="font-semibold">{project.name}</p>
                    <p
                      className={`mt-1 text-xs ${
                        project.id === projectId ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {project.description || "No description yet."}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          </aside>

          <TaskBoard
            canManageWorkspace={canManageWorkspace}
            editDescription={editDescription}
            editPriority={editPriority}
            editingTaskId={editingTaskId}
            editTitle={editTitle}
            onCancelEditingTask={handleCancelEditingTask}
            onCreateTask={handleCreateTask}
            onEditDescriptionChange={setEditDescription}
            onEditPriorityChange={setEditPriority}
            onEditTitleChange={setEditTitle}
            onSaveTaskEdit={(taskId) => {
              void handleSaveTaskEdit(taskId);
            }}
            onStartEditingTask={handleStartEditingTask}
            onTaskAssigneeChange={setTaskAssignee}
            onTaskAssigneeUpdate={(taskId, assigneeId) => {
              void handleTaskAssigneeUpdate(taskId, assigneeId);
            }}
            onTaskDescriptionChange={setTaskDescription}
            onTaskPriorityChange={setTaskPriority}
            onTaskStatusChange={(taskId, status) => {
              void handleTaskStatusChange(taskId, status);
            }}
            onTaskTitleChange={setTaskTitle}
            projectLoading={loading}
            selectedProjectId={projectId}
            selectedProjectName={selectedProject?.name ?? null}
            selectedWorkspaceId={resolvedWorkspaceId}
            submittingTask={submittingTask}
            taskActionMessage={taskActionMessage}
            taskAssignee={taskAssignee}
            taskDescription={taskDescription}
            taskPriority={taskPriority}
            taskTitle={taskTitle}
            tasks={tasks}
            updatingTaskId={updatingTaskId}
            workspaceMembers={workspaceMembers}
          />
        </section>
      </section>
    </main>
  );
}
