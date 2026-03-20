"use client";

import { useEffect, useState } from "react";
import type { WorkspaceMember, WorkspaceRole } from "./dashboard/types";
import { useToast } from "./ui/toast-provider";

type WorkspaceMembersPanelProps = {
  workspaceName: string | null;
  members: WorkspaceMember[];
  canManageWorkspace: boolean;
  isLoading: boolean;
  actionMessage: string | null;
  onAddWorkspaceMember: (email: string, role: WorkspaceRole) => void;
  onUpdateWorkspaceMemberRole: (memberUserId: string, role: WorkspaceRole) => void;
  onRemoveWorkspaceMember: (memberUserId: string) => void;
};

export function WorkspaceMembersPanel({
  workspaceName,
  members,
  canManageWorkspace,
  isLoading,
  actionMessage,
  onAddWorkspaceMember,
  onUpdateWorkspaceMemberRole,
  onRemoveWorkspaceMember,
}: WorkspaceMembersPanelProps) {
  const { showToast } = useToast();
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<WorkspaceRole>("MEMBER");

  function handleAddMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAddWorkspaceMember(memberEmail, memberRole);
    setMemberEmail("");
    setMemberRole("MEMBER");
  }

  useEffect(() => {
    if (actionMessage) {
      showToast(actionMessage, "success");
    }
  }, [actionMessage, showToast]);

  return (
    <section className="rounded-[2.15rem] border border-slate-200 bg-white p-6 shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
            Team members
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">
            {workspaceName ? `${workspaceName} team` : "Workspace team"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Membership and roles live here now, instead of crowding the main dashboard.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-900/10 bg-[#fff7ec] px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[#8d5b28]">
            {members.length} members
          </span>
          {isLoading ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
              Updating
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {members.length > 0 ? (
          members.map((member) => (
            <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg" key={member.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-slate-900">
                      {member.user.name}
                    </p>
                    <span className="rounded-full bg-[#e7f3f0] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-700">
                      {member.role}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{member.user.email}</p>
                </div>
                {canManageWorkspace ? (
                  <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <select
                      className="min-w-0 rounded-full border border-slate-900/10 bg-white px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-700 outline-none transition focus:border-slate-900/30"
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
                      className="tf-btn-danger px-3 py-2 text-[11px]"
                      onClick={() => {
                        showToast(`Removing ${member.user.name}...`, "info");
                        onRemoveWorkspaceMember(member.user.id);
                      }}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="tf-empty-state rounded-[1.5rem] px-5 py-8 text-center text-sm text-slate-600">
            <p className="text-lg font-semibold text-slate-900">No members found</p>
            <p className="mt-2">
              Add the first teammate here to start assigning work across projects.
            </p>
          </div>
        )}
      </div>

      {actionMessage ? (
        <div className="mt-4 rounded-2xl border border-[#2a9d8f]/25 bg-[#edf8f5] px-4 py-3 text-sm text-[#1f6c63]">
          {actionMessage}
        </div>
      ) : null}

      {canManageWorkspace ? (
        <form
          className="mt-6 rounded-[2rem] border border-slate-200 bg-slate-50 p-5 shadow-sm"
          onSubmit={handleAddMember}
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                Add member
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Invite an existing user into the team directly.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
              <input
                className="min-w-0 rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
                onChange={(event) => setMemberEmail(event.target.value)}
                placeholder="teammate@example.com"
                required
                type="email"
                value={memberEmail}
              />
              <select
                className="min-w-0 rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
                onChange={(event) => setMemberRole(event.target.value as WorkspaceRole)}
                value={memberRole}
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
                <option value="OWNER">Owner</option>
              </select>
            </div>
            <div className="flex justify-start md:justify-end">
              <button
                className="tf-btn-primary w-full md:w-auto"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? (
                  <>
                    <span className="tf-spinner mr-2" />
                    Saving...
                  </>
                ) : (
                  "Add member"
                )}
              </button>
            </div>
          </div>
        </form>
      ) : null}
    </section>
  );
}
