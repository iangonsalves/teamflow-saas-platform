"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiRequestWithToken } from "@/lib/api";
import { clearAuthSession, getAccessToken } from "@/lib/auth-storage";
import { TaskBoard } from "./dashboard/task-board";
import { AppPageShell } from "./shell/app-page-shell";
import { ShellHeroHeader } from "./shell/shell-hero-header";
import { Skeleton } from "./ui/skeleton";
import { useToast } from "./ui/toast-provider";
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
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
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
  const todoCount = tasks.filter((task) => task.status === "TODO").length;
  const inProgressCount = tasks.filter((task) => task.status === "IN_PROGRESS").length;
  const doneCount = tasks.filter((task) => task.status === "DONE").length;
  const progressPercent = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

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

  useEffect(() => {
    if (taskActionMessage) {
      showToast(taskActionMessage, "success");
    }
  }, [showToast, taskActionMessage]);

  useEffect(() => {
    if (errorMessage) {
      showToast(errorMessage, "error");
    }
  }, [errorMessage, showToast]);

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
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(42,157,143,0.14),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(244,162,97,0.14),_transparent_30%),linear-gradient(180deg,_#eddcbf_0%,_#dcc39a_100%)] px-6 py-8 text-slate-900 sm:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-[2.25rem] border border-[#b99563] bg-[#fff1dc] p-6 shadow-[0_30px_84px_rgba(15,23,42,0.14)]">
            <Skeleton className="h-4 w-32 rounded-full" />
            <Skeleton className="mt-5 h-12 w-[min(26rem,78%)] rounded-2xl" />
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div className="rounded-[1.5rem] border border-[#d7c5aa] bg-[#f4ead9] p-4" key={index}>
                  <Skeleton className="h-3 w-20 rounded-full" />
                  <Skeleton className="mt-4 h-8 w-16 rounded-xl" />
                  <Skeleton className="mt-3 h-3 w-28 rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
            <Skeleton className="h-[24rem] rounded-[2rem]" />
            <Skeleton className="h-[38rem] rounded-[2rem]" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <AppPageShell
      backHref={resolvedWorkspaceId ? `/workspaces/${resolvedWorkspaceId}` : "/dashboard"}
      backLabel={resolvedWorkspaceId ? "Back to workspace" : "Back to overview"}
      maxWidth="7xl"
    >
        <ShellHeroHeader
          controls={
            <>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-400">
                Control
              </p>
              <p className="mt-4 text-2xl font-semibold">Keep the board moving.</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Team size: {workspaceMembers.length}. Your role: {selectedWorkspaceRole ?? "MEMBER"}.
              </p>
              <div className="mt-6 grid gap-3">
                <Link
                  className="tf-btn-ghost"
                  href={
                    resolvedWorkspaceId
                      ? `/settings/billing?workspaceId=${resolvedWorkspaceId}`
                      : "/settings/billing"
                  }
                >
                  Billing
                </Link>
                {resolvedWorkspaceId ? (
                  <Link
                    className="tf-btn-ghost"
                    href={`/workspaces/${resolvedWorkspaceId}`}
                  >
                    Workspace page
                  </Link>
                ) : null}
                <button
                  className="tf-btn-secondary border-white/25 bg-white text-slate-900 hover:border-white/35"
                  onClick={handleLogout}
                  type="button"
                >
                  Log out
                </button>
              </div>
            </>
          }
          description="The task board is the main surface here now, with creation available on demand and the surrounding chrome kept intentionally quieter."
          eyebrow="Project detail"
          metrics={
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-[1.5rem] border border-[#b58e5f] bg-[#fff1dc] p-4 shadow-[0_16px_32px_rgba(15,23,42,0.10)]">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Workspace
                  </p>
                  <p className="mt-3 text-lg font-semibold text-slate-900">
                    {activeWorkspace?.name ?? "Unknown"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">Operational context</p>
                </div>
                <div className="rounded-[1.5rem] border border-[#b58e5f] bg-[#fff1dc] p-4 shadow-[0_16px_32px_rgba(15,23,42,0.10)]">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Todo
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{todoCount}</p>
                  <p className="mt-1 text-sm text-slate-600">Ready to be pulled</p>
                </div>
                <div className="rounded-[1.5rem] border border-[#b58e5f] bg-[#fff1dc] p-4 shadow-[0_16px_32px_rgba(15,23,42,0.10)]">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    In progress
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{inProgressCount}</p>
                  <p className="mt-1 text-sm text-slate-600">Currently moving</p>
                </div>
                <div className="rounded-[1.5rem] border border-[#b58e5f] bg-[#fff1dc] p-4 shadow-[0_16px_32px_rgba(15,23,42,0.10)]">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Done
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{doneCount}</p>
                  <p className="mt-1 text-sm text-slate-600">Finished cards</p>
                </div>
                <div className="rounded-[1.5rem] border border-[#79ae9e] bg-[#cfe6df] p-4 shadow-[0_16px_32px_rgba(42,157,143,0.10)]">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Delivery progress
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{progressPercent}%</p>
                  <div className="mt-4 h-2.5 rounded-full bg-slate-100">
                    <div className="h-2.5 rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{doneCount} of {tasks.length} cards complete.</p>
                </div>
            </div>
          }
          title={selectedProject?.name ?? "Project"}
        />

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-[#e76f51]/25 bg-[#fff0eb] px-5 py-4 text-sm text-[#a13f24]">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-6 grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
            <section className="rounded-[2rem] border border-[#b99563] bg-[#fff1dc] p-5 shadow-[0_26px_76px_rgba(15,23,42,0.14)]">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                Project rail
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Jump between projects without pulling focus away from the board.
              </p>
              <div className="mt-4 grid gap-3">
                {projects.map((project) => (
                  <Link
                    className={`rounded-[1.25rem] border px-4 py-4 text-sm no-underline transition ${
                      project.id === projectId
                        ? "border-slate-900 bg-slate-900 text-white shadow-[0_14px_34px_rgba(15,23,42,0.18)]"
                        : "border-[#b58e5f] bg-[#fff1dc] text-slate-900 hover:border-[#9f7a4f]"
                    }`}
                    href={`/projects/${project.id}?workspaceId=${resolvedWorkspaceId}`}
                    key={project.id}
                  >
                    <p
                      className={`font-semibold ${
                        project.id === projectId ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {project.name}
                    </p>
                    <p
                      className={`mt-1 text-xs ${
                        project.id === projectId ? "text-slate-100" : "text-slate-500"
                      }`}
                    >
                      {project.description || "No description yet."}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-900/10 bg-[linear-gradient(180deg,_#e7f3f0_0%,_#f4fbf9_100%)] p-5 shadow-[0_18px_50px_rgba(42,157,143,0.10)]">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                Team context
              </p>
              <p className="mt-3 text-lg font-semibold text-slate-900">
                {workspaceMembers.length} assignable members
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Assignee controls stay on each card, so the left rail can stay lightweight.
              </p>
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
    </AppPageShell>
  );
}
