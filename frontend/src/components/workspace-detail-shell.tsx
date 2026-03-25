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
import { AppPageShell } from "./shell/app-page-shell";
import { ShellHeroHeader } from "./shell/shell-hero-header";
import { Skeleton } from "./ui/skeleton";
import { useToast } from "./ui/toast-provider";

type WorkspaceDetailShellProps = {
  workspaceId: string;
};

export function WorkspaceDetailShell({
  workspaceId,
}: WorkspaceDetailShellProps) {
  const router = useRouter();
  const { showToast } = useToast();
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
  const ownerCount = workspaceMembers.filter((member) => member.role === "OWNER").length;
  const adminCount = workspaceMembers.filter((member) => member.role === "ADMIN").length;
  const completionPercent =
    projects.length > 0 ? Math.min(100, Math.round((projects.length / Math.max(workspaceMembers.length, 1)) * 25)) : 0;

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
            apiRequestWithToken<{ user: { sub: string; email: string; name: string; avatarUrl?: string | null } }>(
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
          avatarUrl: me.user.avatarUrl ?? null,
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

  useEffect(() => {
    if (workspaceActionMessage) {
      showToast(workspaceActionMessage, "success");
    }
  }, [showToast, workspaceActionMessage]);

  useEffect(() => {
    if (projectActionMessage) {
      showToast(projectActionMessage, "success");
    }
  }, [projectActionMessage, showToast]);

  useEffect(() => {
    if (errorMessage) {
      showToast(errorMessage, "error");
    }
  }, [errorMessage, showToast]);

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
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(33,158,188,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(244,162,97,0.18),_transparent_30%),linear-gradient(180deg,_#eddcbf_0%,_#dcc39a_100%)] px-6 py-8 text-slate-900 sm:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-[2.25rem] border border-[#b99563] bg-[#fff1dc] p-6 shadow-[0_30px_84px_rgba(15,23,42,0.14)]">
            <Skeleton className="h-4 w-36 rounded-full" />
            <Skeleton className="mt-5 h-12 w-[min(28rem,80%)] rounded-2xl" />
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
            <Skeleton className="h-[28rem] rounded-[2rem]" />
            <div className="space-y-6">
              <Skeleton className="h-72 rounded-[2rem]" />
              <div className="grid gap-6 xl:grid-cols-2">
                <Skeleton className="h-[22rem] rounded-[2rem]" />
                <Skeleton className="h-[22rem] rounded-[2rem]" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <AppPageShell backHref="/dashboard" backLabel="Back to overview" maxWidth="7xl">
        <ShellHeroHeader
          controls={
            <>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-400">
                Control
              </p>
              <p className="mt-4 text-2xl font-semibold">Steer the team surface.</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Owner: {workspace?.owner.name ?? "Unknown"} · {ownerCount} owner slot · {projects.length} active lanes.
              </p>
              <div className="mt-6 grid gap-3">
                <Link className="tf-btn-ghost" href="/settings/billing">
                  Billing
                </Link>
                {projects[0] ? (
                  <Link
                    className="tf-btn-ghost"
                    href={`/projects/${projects[0].id}?workspaceId=${workspaceId}`}
                  >
                    Open latest project
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
          description="This page is now the team operating surface: members, invitations, and project planning in one place, with a clearer hierarchy than the old dashboard."
          eyebrow="Workspace detail"
          metrics={
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-[1.5rem] border border-[#b58e5f] bg-[#fff1dc] p-4 shadow-[0_16px_32px_rgba(15,23,42,0.10)]">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Role
                  </p>
                  <p className="mt-3 text-lg font-semibold text-slate-900">
                    {formatRole(selectedWorkspaceRole)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">Your access level here</p>
                </div>
                <div className="rounded-[1.5rem] border border-[#b58e5f] bg-[#fff1dc] p-4 shadow-[0_16px_32px_rgba(15,23,42,0.10)]">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Members
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{workspaceMembers.length}</p>
                  <p className="mt-1 text-sm text-slate-600">People in this team</p>
                </div>
                <div className="rounded-[1.5rem] border border-[#b58e5f] bg-[#fff1dc] p-4 shadow-[0_16px_32px_rgba(15,23,42,0.10)]">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Admins
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{adminCount}</p>
                  <p className="mt-1 text-sm text-slate-600">Operational leads</p>
                </div>
                <div className="rounded-[1.5rem] border border-[#b58e5f] bg-[#fff1dc] p-4 shadow-[0_16px_32px_rgba(15,23,42,0.10)]">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Projects
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{projects.length}</p>
                  <p className="mt-1 text-sm text-slate-600">Delivery lanes in motion</p>
                </div>
                <div className="rounded-[1.5rem] border border-[#79ae9e] bg-[#cfe6df] p-4 shadow-[0_16px_32px_rgba(42,157,143,0.10)]">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Workspace health
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{completionPercent}%</p>
                  <div className="mt-4 h-2.5 rounded-full bg-slate-100">
                    <div className="h-2.5 rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${completionPercent}%` }} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">Planning signal based on active projects and team size.</p>
                </div>
            </div>
          }
          title={workspace?.name ?? "Workspace"}
        />

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-[#e76f51]/25 bg-[#fff0eb] px-5 py-4 text-sm text-[#a13f24]">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-6 grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
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

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
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
    </AppPageShell>
  );
}
