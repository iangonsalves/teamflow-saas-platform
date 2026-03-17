"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequestWithToken } from "@/lib/api";
import {
  clearAuthSession,
  getAccessToken,
  getStoredUser,
  type AuthUser,
} from "@/lib/auth-storage";
import { DashboardHeader } from "./dashboard/dashboard-header";
import { ProjectsPanel } from "./dashboard/projects-panel";
import { TaskBoard } from "./dashboard/task-board";
import type {
  AuthMeResponse,
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
import { WorkspaceSidebar } from "./dashboard/workspace-sidebar";

export function DashboardShell() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedWorkspaceRole, setSelectedWorkspaceRole] = useState<WorkspaceRole | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [projectLoading, setProjectLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("MEDIUM");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [projectActionMessage, setProjectActionMessage] = useState<string | null>(null);
  const [taskActionMessage, setTaskActionMessage] = useState<string | null>(null);
  const [submittingProject, setSubmittingProject] = useState(false);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("MEDIUM");

  const canManageWorkspace =
    selectedWorkspaceRole === "OWNER" || selectedWorkspaceRole === "ADMIN";
  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? null;
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null;

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
          setProjects([]);
          setTasks([]);
          setWorkspaceMembers([]);
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

    const accessToken = token;
    const workspaceId = selectedWorkspaceId;
    let cancelled = false;
    setWorkspaceLoading(true);
    setErrorMessage(null);

    async function loadWorkspaceDetails() {
      try {
        const [membersResponse, projectsResponse] = await Promise.all([
          apiRequestWithToken<WorkspaceMember[]>(
            `/workspaces/${workspaceId}/members`,
            accessToken,
          ),
          apiRequestWithToken<ProjectSummary[]>(
            `/workspaces/${workspaceId}/projects`,
            accessToken,
          ),
        ]);

        if (cancelled) {
          return;
        }

        setWorkspaceMembers(membersResponse);
        setProjects(projectsResponse);

        const workspace = workspaces.find((item) => item.id === workspaceId);
        setSelectedWorkspaceRole(workspace?.members[0]?.role ?? null);

        setSelectedProjectId((currentProjectId) => {
          const previousProjectStillExists = projectsResponse.some(
            (project) => project.id === currentProjectId,
          );

          return previousProjectStillExists
            ? currentProjectId
            : (projectsResponse[0]?.id ?? null);
        });
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Failed to load workspace details.",
          );
        }
      } finally {
        if (!cancelled) {
          setWorkspaceLoading(false);
        }
      }
    }

    void loadWorkspaceDetails();

    return () => {
      cancelled = true;
    };
  }, [selectedWorkspaceId, token, workspaces]);

  useEffect(() => {
    if (!token || !selectedWorkspaceId || !selectedProjectId) {
      setTasks([]);
      return;
    }

    const accessToken = token;
    const workspaceId = selectedWorkspaceId;
    const projectId = selectedProjectId;
    let cancelled = false;
    setProjectLoading(true);

    async function loadTasks() {
      try {
        const tasksResponse = await apiRequestWithToken<TasksResponse>(
          `/workspaces/${workspaceId}/projects/${projectId}/tasks?page=1&pageSize=50`,
          accessToken,
        );

        if (!cancelled) {
          setTasks(tasksResponse.items);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to load tasks.",
          );
        }
      } finally {
        if (!cancelled) {
          setProjectLoading(false);
        }
      }
    }

    void loadTasks();

    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, selectedWorkspaceId, token]);

  async function reloadProjectsAndMembers() {
    if (!token || !selectedWorkspaceId) {
      return;
    }

    const accessToken = token;
    const workspaceId = selectedWorkspaceId;
    const [membersResponse, projectsResponse] = await Promise.all([
      apiRequestWithToken<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`, accessToken),
      apiRequestWithToken<ProjectSummary[]>(`/workspaces/${workspaceId}/projects`, accessToken),
    ]);

    setWorkspaceMembers(membersResponse);
    setProjects(projectsResponse);
    if (!projectsResponse.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(projectsResponse[0]?.id ?? null);
    }
  }

  async function reloadTasks() {
    if (!token || !selectedWorkspaceId || !selectedProjectId) {
      setTasks([]);
      return;
    }

    const accessToken = token;
    const workspaceId = selectedWorkspaceId;
    const projectId = selectedProjectId;
    const tasksResponse = await apiRequestWithToken<TasksResponse>(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks?page=1&pageSize=50`,
      accessToken,
    );
    setTasks(tasksResponse.items);
  }

  async function handleCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !selectedWorkspaceId || !canManageWorkspace) {
      return;
    }

    setSubmittingProject(true);
    setProjectActionMessage(null);
    setErrorMessage(null);

    try {
      const project = await apiRequestWithToken<ProjectSummary>(
        `/workspaces/${selectedWorkspaceId}/projects`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            name: projectName,
            description: projectDescription || undefined,
          }),
        },
      );

      await reloadProjectsAndMembers();
      setSelectedProjectId(project.id);
      setProjectName("");
      setProjectDescription("");
      setProjectActionMessage(`Project "${project.name}" created.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create project.",
      );
    } finally {
      setSubmittingProject(false);
    }
  }

  async function handleCreateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !selectedWorkspaceId || !selectedProjectId || !canManageWorkspace) {
      return;
    }

    setSubmittingTask(true);
    setTaskActionMessage(null);
    setErrorMessage(null);

    try {
      const createdTask = await apiRequestWithToken<TaskSummary>(
        `/workspaces/${selectedWorkspaceId}/projects/${selectedProjectId}/tasks`,
        token,
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

      await reloadTasks();
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
    if (!token || !selectedWorkspaceId || !selectedProjectId) {
      return;
    }

    setUpdatingTaskId(taskId);
    setTaskActionMessage(null);
    setErrorMessage(null);

    try {
      const updatedTask = await apiRequestWithToken<TaskSummary>(
        `/workspaces/${selectedWorkspaceId}/projects/${selectedProjectId}/tasks/${taskId}/status`,
        token,
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
    if (!token || !selectedWorkspaceId || !selectedProjectId) {
      return;
    }

    setUpdatingTaskId(taskId);
    setTaskActionMessage(null);
    setErrorMessage(null);

    try {
      const updatedTask = await apiRequestWithToken<TaskSummary>(
        `/workspaces/${selectedWorkspaceId}/projects/${selectedProjectId}/tasks/${taskId}/assignee`,
        token,
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
    if (!token || !selectedWorkspaceId || !selectedProjectId) {
      return;
    }

    setUpdatingTaskId(taskId);
    setTaskActionMessage(null);
    setErrorMessage(null);

    try {
      const updatedTask = await apiRequestWithToken<TaskSummary>(
        `/workspaces/${selectedWorkspaceId}/projects/${selectedProjectId}/tasks/${taskId}`,
        token,
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

  function handleWorkspaceChange(workspaceId: string) {
    setSelectedWorkspaceId(workspaceId);
    setSelectedProjectId(null);
    setTaskActionMessage(null);
    setProjectActionMessage(null);
    handleCancelEditingTask();
  }

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
            Loading your workspace command center...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(33,158,188,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(244,162,97,0.24),_transparent_30%),linear-gradient(180deg,_#f7f1e7_0%,_#efe7d8_100%)] px-6 py-8 text-slate-900 sm:px-8">
      <section className="mx-auto max-w-7xl">
        <DashboardHeader
          activeTaskCount={tasks.filter((task) => task.status !== "DONE").length}
          activeWorkspaceName={selectedWorkspace?.name ?? null}
          memberCount={workspaceMembers.length}
          onLogout={handleLogout}
          projectCount={projects.length}
          selectedWorkspaceRole={selectedWorkspaceRole}
          taskCount={tasks.length}
          user={user}
        />

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-[#e76f51]/25 bg-[#fff0eb] px-5 py-4 text-sm text-[#a13f24]">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <WorkspaceSidebar
            canManageWorkspace={canManageWorkspace}
            onWorkspaceChange={handleWorkspaceChange}
            selectedWorkspaceId={selectedWorkspaceId}
            token={token}
            user={user}
            workspaceLoading={workspaceLoading}
            workspaceMembers={workspaceMembers}
            workspaces={workspaces}
          />

          <div className="space-y-6">
            <ProjectsPanel
              canManageWorkspace={canManageWorkspace}
              onCreateProject={handleCreateProject}
              onProjectDescriptionChange={setProjectDescription}
              onProjectNameChange={setProjectName}
              onSelectProject={setSelectedProjectId}
              projectActionMessage={projectActionMessage}
              projectDescription={projectDescription}
              projectName={projectName}
              projects={projects}
              selectedProject={selectedProject}
              selectedProjectId={selectedProjectId}
              selectedWorkspace={selectedWorkspace}
              selectedWorkspaceId={selectedWorkspaceId}
              submittingProject={submittingProject}
            />

            <TaskBoard
              canManageWorkspace={canManageWorkspace}
              onCreateTask={handleCreateTask}
              onTaskAssigneeChange={setTaskAssignee}
              onTaskDescriptionChange={setTaskDescription}
              onTaskPriorityChange={setTaskPriority}
              onEditDescriptionChange={setEditDescription}
              onEditPriorityChange={setEditPriority}
              onEditTitleChange={setEditTitle}
              onCancelEditingTask={handleCancelEditingTask}
              onSaveTaskEdit={(taskId) => {
                void handleSaveTaskEdit(taskId);
              }}
              onStartEditingTask={handleStartEditingTask}
              onTaskAssigneeUpdate={(taskId, assigneeId) => {
                void handleTaskAssigneeUpdate(taskId, assigneeId);
              }}
              onTaskStatusChange={(taskId, status) => {
                void handleTaskStatusChange(taskId, status);
              }}
              onTaskTitleChange={setTaskTitle}
              editDescription={editDescription}
              editPriority={editPriority}
              editingTaskId={editingTaskId}
              editTitle={editTitle}
              projectLoading={projectLoading}
              selectedProjectId={selectedProjectId}
              selectedProjectName={selectedProject?.name ?? null}
              selectedWorkspaceId={selectedWorkspaceId}
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
          </div>
        </section>
      </section>
    </main>
  );
}
