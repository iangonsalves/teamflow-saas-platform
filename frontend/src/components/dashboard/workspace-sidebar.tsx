import type { AuthUser } from "@/lib/auth-storage";
import { InvitationsPanel } from "../invitations-panel";
import type { WorkspaceMember, WorkspaceSummary } from "./types";
import { formatRole } from "./utils";

type WorkspaceSidebarProps = {
  user: AuthUser | null;
  workspaces: WorkspaceSummary[];
  selectedWorkspaceId: string | null;
  workspaceMembers: WorkspaceMember[];
  workspaceLoading: boolean;
  canManageWorkspace: boolean;
  token: string | null;
  onWorkspaceChange: (workspaceId: string) => void;
};

export function WorkspaceSidebar({
  user,
  workspaces,
  selectedWorkspaceId,
  workspaceMembers,
  workspaceLoading,
  canManageWorkspace,
  token,
  onWorkspaceChange,
}: WorkspaceSidebarProps) {
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
      </section>

      <section className="rounded-[2rem] border border-slate-900/10 bg-white/72 p-6 backdrop-blur">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
          Team members
        </p>
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
                  <span className="rounded-full bg-[#e7f3f0] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-700">
                    {member.role}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-600">
              Pick a workspace to see its team composition.
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
        canManage={canManageWorkspace}
        key={selectedWorkspaceId ?? "no-workspace"}
        token={token}
        workspaceId={selectedWorkspaceId}
      />
    </div>
  );
}
