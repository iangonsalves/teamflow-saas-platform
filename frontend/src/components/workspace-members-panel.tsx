"use client";

import { useState } from "react";
import type { WorkspaceMember, WorkspaceRole } from "./dashboard/types";

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
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<WorkspaceRole>("MEMBER");

  function handleAddMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAddWorkspaceMember(memberEmail, memberRole);
    setMemberEmail("");
    setMemberRole("MEMBER");
  }

  return (
    <section className="rounded-[2rem] border border-slate-900/10 bg-white/82 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
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
        {isLoading ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
            Updating
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3">
        {members.length > 0 ? (
          members.map((member) => (
            <div
              className="rounded-[1.5rem] border border-slate-900/10 bg-[#fffdfa] p-4"
              key={member.id}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {member.user.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{member.user.email}</p>
                </div>
                {canManageWorkspace ? (
                  <div className="flex flex-wrap items-center gap-2">
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
          <div className="rounded-[1.5rem] border border-dashed border-slate-900/15 bg-[#fffdfa] px-5 py-8 text-sm text-slate-600">
            No members found for this workspace yet.
          </div>
        )}
      </div>

      {actionMessage ? (
        <div className="mt-4 rounded-2xl border border-[#2a9d8f]/25 bg-[#edf8f5] px-4 py-3 text-sm text-[#1f6c63]">
          {actionMessage}
        </div>
      ) : null}

      {canManageWorkspace ? (
        <form className="mt-5 border-t border-slate-900/10 pt-5" onSubmit={handleAddMember}>
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
          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
            <input
              className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
              onChange={(event) => setMemberEmail(event.target.value)}
              placeholder="teammate@example.com"
              required
              type="email"
              value={memberEmail}
            />
            <select
              className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
              onChange={(event) => setMemberRole(event.target.value as WorkspaceRole)}
              value={memberRole}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
            </select>
            <button
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Saving..." : "Add member"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
