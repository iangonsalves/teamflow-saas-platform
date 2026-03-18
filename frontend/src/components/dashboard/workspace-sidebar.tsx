import { useState } from "react";
import type { AuthUser } from "@/lib/auth-storage";
import { InvitationsPanel } from "../invitations-panel";
import type { WorkspaceMember, WorkspaceRole, WorkspaceSummary } from "./types";
import { formatRole } from "./utils";

type WorkspaceSidebarProps = {
  user: AuthUser | null;
  workspaces: WorkspaceSummary[];
  selectedWorkspaceId: string | null;
  selectedWorkspaceName: string | null;
  workspaceMembers: WorkspaceMember[];
  workspaceLoading: boolean;
  canManageWorkspace: boolean;
  token: string | null;
  workspaceActionMessage: string | null;
  onCreateWorkspace: (name: string) => void;
  onAddWorkspaceMember: (email: string, role: WorkspaceRole) => void;
  onUpdateWorkspaceMemberRole: (memberUserId: string, role: WorkspaceRole) => void;
  onRemoveWorkspaceMember: (memberUserId: string) => void;
  onWorkspaceChange: (workspaceId: string) => void;
};

export function WorkspaceSidebar({
  user,
  workspaces,
  selectedWorkspaceId,
  selectedWorkspaceName,
  workspaceMembers,
  workspaceLoading,
  canManageWorkspace,
  token,
  workspaceActionMessage,
  onCreateWorkspace,
  onAddWorkspaceMember,
  onUpdateWorkspaceMemberRole,
  onRemoveWorkspaceMember,
  onWorkspaceChange,
}: WorkspaceSidebarProps) {
  const [workspaceName, setWorkspaceName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<WorkspaceRole>("MEMBER");

  function handleCreateWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreateWorkspace(workspaceName);
    setWorkspaceName("");
  }

  function handleAddMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAddWorkspaceMember(memberEmail, memberRole);
    setMemberEmail("");
    setMemberRole("MEMBER");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-900/10 bg-white/72 p-6 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
              Workspaces
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Switch the operational context for the rest of the dashboard.
            </p>
          </div>
          {workspaceLoading ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
              Updating
            </span>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3">
          {workspaces.length > 0 ? (
            workspaces.map((workspace) => {
              const isActive = workspace.id === selectedWorkspaceId;

              return (
                <button
                  className={`rounded-[1.5rem] border p-4 text-left transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]"
                      : "border-slate-900/10 bg-[#f7efe2] text-slate-900 hover:border-slate-900/25"
                  }`}
                  key={workspace.id}
                  onClick={() => onWorkspaceChange(workspace.id)}
                  type="button"
                >
                  <p className="text-base font-semibold">{workspace.name}</p>
                  <p
                    className={`mt-1 text-sm ${
                      isActive ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    Your role: {formatRole(workspace.members[0]?.role ?? null)}
                  </p>
                </button>
              );
            })
          ) : (
            <p className="text-sm text-slate-600">
              No workspaces yet. Create one from Swagger or add a dedicated
              workspace creation flow next.
            </p>
          )}
        </div>

        <form className="mt-5 border-t border-slate-900/10 pt-5" onSubmit={handleCreateWorkspace}>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
            Create workspace
          </p>
          <input
            className="mt-3 w-full rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="Studio Ops"
            required
            value={workspaceName}
          />
          <button
            className="mt-3 w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={workspaceLoading}
            type="submit"
          >
            {workspaceLoading ? "Creating..." : "Create workspace"}
          </button>
        </form>
      </section>

      <section className="rounded-[2rem] border border-slate-900/10 bg-white/72 p-6 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
              Team members
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {selectedWorkspaceName
                ? `Manage the team inside ${selectedWorkspaceName}.`
                : "Choose a workspace to manage its members."}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {workspaceMembers.length > 0 ? (
            workspaceMembers.map((member) => (
              <div
                className="rounded-[1.25rem] border border-slate-900/10 bg-white p-4"
                key={member.id}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {member.user.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{member.user.email}</p>
                  </div>
                  {canManageWorkspace ? (
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-full border border-slate-900/10 bg-white px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-700 outline-none transition focus:border-slate-900/30"
                        onChange={(event) =>
                          onUpdateWorkspaceMemberRole(
                            member.user.id,
                            event.target.value as WorkspaceRole,
                          )
                        }
                        value={member.role}
                      >
                        <option value="OWNER">OWNER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="MEMBER">MEMBER</option>
                      </select>
                      <button
                        className="rounded-full border border-[#e76f51]/25 bg-[#fff0eb] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#a13f24] transition hover:bg-[#ffe6de]"
                        onClick={() => onRemoveWorkspaceMember(member.user.id)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <span className="rounded-full bg-[#e7f3f0] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-700">
                      {member.role}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-600">
              Pick a workspace to see its team composition.
            </p>
          )}
        </div>

        {workspaceActionMessage ? (
          <div className="mt-4 rounded-2xl border border-[#2a9d8f]/25 bg-[#edf8f5] px-4 py-3 text-sm text-[#1f6c63]">
            {workspaceActionMessage}
          </div>
        ) : null}

        {canManageWorkspace ? (
          <form className="mt-5 border-t border-slate-900/10 pt-5" onSubmit={handleAddMember}>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
              Add member directly
            </p>
            <div className="mt-3 grid gap-3">
              <input
                className="w-full rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
                onChange={(event) => setMemberEmail(event.target.value)}
                placeholder="teammate@example.com"
                required
                type="email"
                value={memberEmail}
              />
              <select
                className="w-full rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
                onChange={(event) => setMemberRole(event.target.value as WorkspaceRole)}
                value={memberRole}
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
                <option value="OWNER">Owner</option>
              </select>
              <button
                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={!selectedWorkspaceId || workspaceLoading}
                type="submit"
              >
                {workspaceLoading ? "Saving..." : "Add member"}
              </button>
            </div>
          </form>
        ) : null}
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
        canManage={canManageWorkspace}
        key={selectedWorkspaceId ?? "no-workspace"}
        token={token}
        workspaceId={selectedWorkspaceId}
      />
    </div>
  );
}
