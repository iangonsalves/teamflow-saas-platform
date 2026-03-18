"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequestWithToken } from "@/lib/api";
import {
  clearAuthSession,
  getAccessToken,
  getStoredUser,
  type AuthUser,
} from "@/lib/auth-storage";
import { InvitationsPanel } from "./invitations-panel";
import { PageBackLink } from "./page-back-link";
import { WorkspaceSidebar } from "./dashboard/workspace-sidebar";
import type {
  ProjectSummary,
  WorkspaceDetail,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceSummary,
} from "./dashboard/types";
import { formatRole } from "./dashboard/utils";
import { WorkspaceMembersPanel } from "./workspace-members-panel";
import { WorkspaceProjectsPanel } from "./workspace-projects-panel";

type WorkspaceDetailShellProps = {
  workspaceId: string;
};

export function WorkspaceDetailShell({
  workspaceId,
}: WorkspaceDetailShellProps) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedWorkspaceRole, setSelectedWorkspaceRole] = useState<WorkspaceRole | null>(
    null,
  );
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceActionMessage, setWorkspaceActionMessage] = useState<string | null>(
    null,
  );
  const [projectActionMessage, setProjectActionMessage] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [submittingProject, setSubmittingProject] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canManageWorkspace =
    selectedWorkspaceRole === "OWNER" || selectedWorkspaceRole === "ADMIN";

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

    async function loadWorkspace() {
      try {
        const [me, workspaceItems, workspaceResponse, membersResponse, projectsResponse] =
          await Promise.all([
            apiRequestWithToken<{ user: { sub: string; email: string; name: string } }>(
              "/auth/me",
              sessionToken,
            ),
            apiRequestWithToken<WorkspaceSummary[]>("/workspaces", sessionToken),
            apiRequestWithToken<WorkspaceDetail>(`/workspaces/${workspaceId}`, sessionToken),
            apiRequestWithToken<WorkspaceMember[]>(
              `/workspaces/${workspaceId}/members`,
              sessionToken,
            ),
            apiRequestWithToken<ProjectSummary[]>(
              `/workspaces/${workspaceId}/projects`,
              sessionToken,
            ),
          ]);

        if (cancelled) {
          return;
        }

        setUser({
          id: me.user.sub,
          name: me.user.name,
          email: me.user.email,
        });
        setWorkspaces(workspaceItems);
        setWorkspace(workspaceResponse);
        setWorkspaceMembers(membersResponse);
        setProjects(projectsResponse);

        const activeWorkspace = workspaceItems.find((item) => item.id === workspaceId);
        setSelectedWorkspaceRole(activeWorkspace?.members[0]?.role ?? null);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to load workspace.",
          );
        }
      } finally {
        if (!cancelled) {
          setWorkspaceLoading(false);
        }
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [router, workspaceId]);

  async function reloadWorkspaceState() {
    if (!token) {
      return;
    }

    const sessionToken = token;
    const [workspaceItems, workspaceResponse, membersResponse, projectsResponse] =
      await Promise.all([
        apiRequestWithToken<WorkspaceSummary[]>("/workspaces", sessionToken),
        apiRequestWithToken<WorkspaceDetail>(`/workspaces/${workspaceId}`, sessionToken),
        apiRequestWithToken<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`, sessionToken),
        apiRequestWithToken<ProjectSummary[]>(`/workspaces/${workspaceId}/projects`, sessionToken),
      ]);

    setWorkspaces(workspaceItems);
    setWorkspace(workspaceResponse);
    setWorkspaceMembers(membersResponse);
    setProjects(projectsResponse);
    const activeWorkspace = workspaceItems.find((item) => item.id === workspaceId);
    setSelectedWorkspaceRole(activeWorkspace?.members[0]?.role ?? null);
  }

  async function handleCreateWorkspace(name: string) {
    if (!token) {
      return;
    }

    const sessionToken = token;
    setWorkspaceLoading(true);
    setWorkspaceActionMessage(null);
    setErrorMessage(null);

    try {
      const createdWorkspace = await apiRequestWithToken<WorkspaceSummary>(
        "/workspaces",
        sessionToken,
        {
          method: "POST",
          body: JSON.stringify({ name }),
        },
      );

      await reloadWorkspaceState();
      setWorkspaceActionMessage(`Workspace "${createdWorkspace.name}" created.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create workspace.",
      );
    } finally {
      setWorkspaceLoading(false);
    }
  }

  async function handleAddWorkspaceMember(email: string, role: WorkspaceRole) {
    if (!token) {
      return;
    }

    const sessionToken = token;
    setWorkspaceLoading(true);
    setWorkspaceActionMessage(null);
    setErrorMessage(null);

    try {
      const membership = await apiRequestWithToken<WorkspaceMember>(
        `/workspaces/${workspaceId}/members`,
        sessionToken,
        {
          method: "POST",
          body: JSON.stringify({ email, role }),
        },
      );

      await reloadWorkspaceState();
      setWorkspaceActionMessage(
        `${membership.user.name} was added as ${membership.role.toLowerCase()}.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to add workspace member.",
      );
    } finally {
      setWorkspaceLoading(false);
    }
  }

  async function handleUpdateWorkspaceMemberRole(
    memberUserId: string,
    role: WorkspaceRole,
  ) {
    if (!token) {
      return;
    }

    const sessionToken = token;
    setWorkspaceLoading(true);
    setWorkspaceActionMessage(null);
    setErrorMessage(null);

    try {
      const membership = await apiRequestWithToken<WorkspaceMember>(
        `/workspaces/${workspaceId}/members/${memberUserId}`,
        sessionToken,
        {
          method: "PATCH",
          body: JSON.stringify({ role }),
        },
      );

      await reloadWorkspaceState();
      setWorkspaceActionMessage(
        `${membership.user.name} is now ${membership.role.toLowerCase()}.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update member role.",
      );
    } finally {
      setWorkspaceLoading(false);
    }
  }

  async function handleRemoveWorkspaceMember(memberUserId: string) {
    if (!token) {
      return;
    }

    const sessionToken = token;
    setWorkspaceLoading(true);
    setWorkspaceActionMessage(null);
    setErrorMessage(null);

    try {
      await apiRequestWithToken(
        `/workspaces/${workspaceId}/members/${memberUserId}`,
        sessionToken,
        {
          method: "DELETE",
        },
      );

      await reloadWorkspaceState();
      setWorkspaceActionMessage("Workspace member removed.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to remove workspace member.",
      );
    } finally {
      setWorkspaceLoading(false);
    }
  }

  async function handleCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !canManageWorkspace) {
      return;
    }

    const sessionToken = token;
    setSubmittingProject(true);
    setProjectActionMessage(null);
    setErrorMessage(null);

    try {
      const project = await apiRequestWithToken<ProjectSummary>(
        `/workspaces/${workspaceId}/projects`,
        sessionToken,
        {
          method: "POST",
          body: JSON.stringify({
            name: projectName,
            description: projectDescription || undefined,
          }),
        },
      );

      await reloadWorkspaceState();
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

  function handleLogout() {
    clearAuthSession();
    router.push("/login");
  }

  if (workspaceLoading && !workspace) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(33,158,188,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(244,162,97,0.18),_transparent_30%),linear-gradient(180deg,_#f8f3ea_0%,_#efe4d3_100%)] px-6 py-8 text-slate-900 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-slate-500">
            Workspace
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Loading workspace surface...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(42,157,143,0.14),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(231,111,81,0.12),_transparent_28%),linear-gradient(180deg,_#f8f3ea_0%,_#efe4d3_100%)] px-6 py-8 text-slate-900 sm:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6">
          <PageBackLink href="/dashboard" label="Back to overview" />
        </div>

        <header className="rounded-[2rem] border border-slate-900/10 bg-white/78 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.09)] backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="font-mono text-xs uppercase tracking-[0.32em] text-slate-500">
                Workspace detail
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                {workspace?.name ?? "Workspace"}
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Members, invitations, and project planning now live on their own page so the
                overview can stay readable.
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
                Role
              </p>
              <p className="mt-3 text-lg font-semibold text-slate-900">
                {formatRole(selectedWorkspaceRole)}
              </p>
              <p className="mt-1 text-sm text-slate-600">Your access level here</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-white p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Members
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{workspaceMembers.length}</p>
              <p className="mt-1 text-sm text-slate-600">People in this team</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-white p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Projects
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{projects.length}</p>
              <p className="mt-1 text-sm text-slate-600">Delivery lanes in motion</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-slate-900 p-4 text-slate-50">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-400">
                Owner
              </p>
              <p className="mt-3 text-lg font-semibold">{workspace?.owner.name ?? "Unknown"}</p>
              <p className="mt-1 text-sm text-slate-300">{workspace?.owner.email ?? user?.email}</p>
            </div>
          </div>
        </header>

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
            onWorkspaceChange={(nextWorkspaceId) => {
              router.push(`/workspaces/${nextWorkspaceId}`);
            }}
            selectedWorkspaceId={workspaceId}
            user={user}
            workspaceActionMessage={workspaceActionMessage}
            workspaceLoading={workspaceLoading}
            workspaces={workspaces}
          />

          <div className="space-y-6">
            <WorkspaceProjectsPanel
              canManageWorkspace={canManageWorkspace}
              onCreateProject={handleCreateProject}
              onProjectDescriptionChange={setProjectDescription}
              onProjectNameChange={setProjectName}
              projectActionMessage={projectActionMessage}
              projectDescription={projectDescription}
              projectName={projectName}
              projects={projects}
              submittingProject={submittingProject}
              workspaceId={workspaceId}
              workspaceName={workspace?.name ?? null}
            />

            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <WorkspaceMembersPanel
                actionMessage={workspaceActionMessage}
                canManageWorkspace={canManageWorkspace}
                isLoading={workspaceLoading}
                members={workspaceMembers}
                onAddWorkspaceMember={(email, role) => {
                  void handleAddWorkspaceMember(email, role);
                }}
                onRemoveWorkspaceMember={(memberUserId) => {
                  void handleRemoveWorkspaceMember(memberUserId);
                }}
                onUpdateWorkspaceMemberRole={(memberUserId, role) => {
                  void handleUpdateWorkspaceMemberRole(memberUserId, role);
                }}
                workspaceName={workspace?.name ?? null}
              />

              <InvitationsPanel
                canManage={canManageWorkspace}
                key={workspaceId}
                token={token}
                workspaceId={workspaceId}
              />
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
