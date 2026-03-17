import Link from "next/link";
import type { AuthUser } from "@/lib/auth-storage";
import { formatRole } from "./utils";

type DashboardHeaderProps = {
  user: AuthUser | null;
  activeWorkspaceName: string | null;
  selectedWorkspaceRole: "OWNER" | "ADMIN" | "MEMBER" | null;
  projectCount: number;
  taskCount: number;
  activeTaskCount: number;
  memberCount: number;
  onLogout: () => void;
};

export function DashboardHeader({
  user,
  activeWorkspaceName,
  selectedWorkspaceRole,
  projectCount,
  taskCount,
  activeTaskCount,
  memberCount,
  onLogout,
}: DashboardHeaderProps) {
  return (
    <header className="rounded-[2rem] border border-slate-900/10 bg-white/72 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.09)] backdrop-blur">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-slate-500">
            TeamFlow Operations
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            {user ? `${user.name}, here is the state of your team.` : "Workspace overview"}
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Manage one workspace at a time, move projects forward, and keep tasks
            flowing without jumping between backend tools.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            href="/"
          >
            Landing page
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-900/10 bg-[#e7f3f0] px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-[#d9ece7]"
            href="/settings/billing"
          >
            Billing
          </Link>
          <button
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
            onClick={onLogout}
            type="button"
          >
            Log out
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-[1.5rem] border border-slate-900/10 bg-[#f8f2e6] p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
            Active workspace
          </p>
          <p className="mt-3 text-lg font-semibold text-slate-900">
            {activeWorkspaceName ?? "None yet"}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {formatRole(selectedWorkspaceRole)}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-900/10 bg-white p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
            Projects
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{projectCount}</p>
          <p className="mt-1 text-sm text-slate-600">
            Delivery lanes in the selected workspace
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-900/10 bg-white p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
            Tasks
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{taskCount}</p>
          <p className="mt-1 text-sm text-slate-600">{activeTaskCount} still in motion</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-900/10 bg-slate-900 p-4 text-slate-50">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-400">
            Team
          </p>
          <p className="mt-3 text-3xl font-semibold">{memberCount}</p>
          <p className="mt-1 text-sm text-slate-300">{user?.email ?? "Signed-in user"}</p>
        </div>
      </div>
    </header>
  );
}
