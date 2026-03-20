"use client";

import { useState } from "react";
import Link from "next/link";
import type { AuthUser } from "@/lib/auth-storage";
import type { WorkspaceSummary } from "./types";
import { formatRole } from "./utils";

type WorkspaceSidebarProps = {
  user: AuthUser | null;
  workspaces: WorkspaceSummary[];
  selectedWorkspaceId: string | null;
  workspaceLoading: boolean;
  workspaceActionMessage: string | null;
  onCreateWorkspace: (name: string) => void;
  onWorkspaceChange: (workspaceId: string) => void;
};

export function WorkspaceSidebar({
  user,
  workspaces,
  selectedWorkspaceId,
  workspaceLoading,
  workspaceActionMessage,
  onCreateWorkspace,
  onWorkspaceChange,
}: WorkspaceSidebarProps) {
  const [workspaceName, setWorkspaceName] = useState("");
  const userInitials =
    user?.name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "TF";

  function handleCreateWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreateWorkspace(workspaceName);
    setWorkspaceName("");
  }

  return (
    <aside className="flex h-full min-h-[calc(100vh-7rem)] flex-col rounded-[2rem] border border-slate-800 bg-[linear-gradient(180deg,_#151d31_0%,_#101725_100%)] p-3 text-slate-50 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
      <div className="rounded-[1.35rem] px-3 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,_rgba(96,165,250,0.28)_0%,_rgba(255,255,255,0.12)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            <span className="font-mono text-sm font-semibold tracking-[0.18em] text-white">
              TF
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold">TeamFlow</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
              Workspace shell
            </p>
          </div>
        </div>
        <div className="mt-3 inline-flex rounded-full border border-white/10 bg-white/4 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">
          Navigation
        </div>
      </div>

      <div className="mt-2 rounded-[1.6rem] border border-white/8 bg-white/4 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/8 font-mono text-[10px] font-semibold tracking-[0.16em] text-slate-200">
                WS
              </span>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">
                Workspaces
              </p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Switch team context and open the dedicated workspace page when action is needed.
            </p>
          </div>
          {workspaceLoading ? (
            <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">
              Updating
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2.5">
          {workspaces.length > 0 ? (
            workspaces.map((workspace) => {
              const isActive = workspace.id === selectedWorkspaceId;

              return (
                <div
                  className={`rounded-[1.2rem] border p-4 transition-all duration-200 ${
                    isActive
                      ? "border-white/8 bg-white/12 text-white shadow-[0_18px_36px_rgba(15,23,42,0.28)]"
                      : "border-white/6 bg-white/4 text-slate-100 hover:border-white/12 hover:bg-white/7"
                  }`}
                  key={workspace.id}
                >
                  <button
                    className="w-full text-left"
                    onClick={() => onWorkspaceChange(workspace.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base font-semibold">{workspace.name}</p>
                      {isActive ? (
                        <span className="text-sm text-blue-300">✓</span>
                      ) : null}
                    </div>
                    <p
                      className={`mt-1 text-sm ${
                        isActive ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      Your role: {formatRole(workspace.members[0]?.role ?? null)}
                    </p>
                  </button>

                  <div className="mt-3 flex gap-2">
                    <Link
                      className={`rounded-full px-3 py-2 text-xs font-medium no-underline transition-all duration-200 ${
                        isActive
                          ? "border border-white/15 bg-white/10 text-white hover:bg-white/15"
                          : "border border-white/10 bg-white/6 text-white hover:bg-white/10"
                      }`}
                      href={`/workspaces/${workspace.id}`}
                    >
                      Open workspace
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-600">
              No workspaces yet. Create your first team space here.
            </p>
          )}
        </div>

        <form className="mt-5 border-t border-white/8 pt-5" onSubmit={handleCreateWorkspace}>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/8 font-mono text-[10px] font-semibold tracking-[0.16em] text-slate-200">
              +
            </span>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">
              Create workspace
            </p>
          </div>
          <input
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/92 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400"
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="Studio Ops"
            required
            value={workspaceName}
          />
          <button className="tf-btn-primary mt-3 w-full" disabled={workspaceLoading} type="submit">
            {workspaceLoading ? (
              <>
                <span className="tf-spinner mr-2" />
                Creating...
              </>
            ) : (
              "Create workspace"
            )}
          </button>
        </form>
      </div>

      {workspaceActionMessage ? (
        <div className="mt-4 rounded-[1.5rem] border border-[#2a9d8f]/20 bg-[#edf8f5] px-4 py-4 text-sm text-[#1f6c63] shadow-[0_16px_40px_rgba(42,157,143,0.08)]">
          {workspaceActionMessage}
        </div>
      ) : null}

      <section className="mt-auto rounded-[1.75rem] border border-white/8 bg-white/4 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">
          Current user
        </p>
        <div className="mt-4 flex items-center gap-3 rounded-[1.4rem] border border-white/8 bg-white/6 p-4 text-slate-50">
          <Link className="flex min-w-0 flex-1 items-center gap-3 no-underline" href="/account">
            {user?.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                alt={`${user.name ?? "User"} avatar`}
                className="h-12 w-12 rounded-2xl object-cover"
                src={user.avatarUrl}
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#f8fafc_0%,_#94a3b8_100%)] text-sm font-semibold tracking-[0.18em] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                {userInitials}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{user?.name ?? "Unknown user"}</p>
              <p className="mt-1 truncate text-sm text-slate-300">{user?.email}</p>
            </div>
          </Link>
        </div>
        <div className="mt-4 grid gap-3">
          <Link
            className="tf-btn-secondary w-full border-white/12 bg-white text-slate-900 hover:border-white/18"
            href="/settings/billing"
          >
            Open billing
          </Link>
        </div>
      </section>
    </aside>
  );
}
