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

  function handleCreateWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreateWorkspace(workspaceName);
    setWorkspaceName("");
  }

  return (
    <div className="space-y-6 xl:sticky xl:top-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
              Workspaces
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Switch the active team, then step into a dedicated workspace view when needed.
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
                <div
                  className={`rounded-[1.5rem] border p-4 transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]"
                      : "border-slate-900/10 bg-[#f7efe2] text-slate-900 hover:border-slate-900/25"
                  }`}
                  key={workspace.id}
                >
                  <button
                    className="w-full text-left"
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

                  <div className="mt-3 flex gap-2">
                    <Link
                    className={`rounded-full px-3 py-2 text-xs font-medium no-underline transition-all duration-200 ${
                        isActive
                          ? "border border-white/15 bg-white/10 text-white hover:bg-white/15"
                          : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
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
      </section>

      {workspaceActionMessage ? (
        <div className="rounded-[2rem] border border-[#2a9d8f]/25 bg-[#edf8f5] px-4 py-4 text-sm text-[#1f6c63] shadow-[0_16px_40px_rgba(42,157,143,0.08)]">
          {workspaceActionMessage}
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 shadow-sm">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
          Current user
        </p>
        <div className="mt-4 rounded-2xl bg-slate-900 p-5 text-slate-50">
          <p className="text-lg font-semibold">{user?.name ?? "Unknown user"}</p>
          <p className="mt-1 text-sm text-slate-300">{user?.email}</p>
        </div>
        <div className="mt-4 grid gap-3">
          <Link
            className="tf-btn-secondary w-full"
            href="/settings/billing"
          >
            Open billing
          </Link>
        </div>
      </section>
    </div>
  );
}
