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
    <header className="rounded-[2.15rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_332px]">
        <div className="tf-hero rounded-[1.9rem] p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <p className="tf-brand-chip">TeamFlow Operations</p>
            <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Live overview
            </span>
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            {user ? `${user.name}, here is the state of your team.` : "Workspace overview"}
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            The overview is now a true command surface: pick the right workspace, scan current
            movement, and jump into workspace or project pages only when you need to act.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
            <div className="min-w-0 rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Active workspace
              </p>
              <p className="mt-3 truncate text-lg font-semibold text-slate-900" title={activeWorkspaceName ?? "None yet"}>
                {activeWorkspaceName ?? "None yet"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {formatRole(selectedWorkspaceRole)}
              </p>
            </div>
            <div className="min-w-0 rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Projects
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{projectCount}</p>
              <p className="mt-1 text-sm text-slate-600">
                Delivery lanes in the selected workspace
              </p>
            </div>
            <div className="min-w-0 rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Tasks
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{taskCount}</p>
              <p className="mt-1 text-sm text-slate-600">{activeTaskCount} still in motion</p>
            </div>
            <div className="min-w-0 rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Team
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{memberCount}</p>
              <p
                className="mt-1 truncate text-xs text-slate-600"
                title={user?.email ?? "Signed-in user"}
              >
                {user?.email ?? "Signed-in user"}
              </p>
            </div>
          </div>
        </div>

        <div className="tf-dark-panel rounded-[1.9rem] border border-slate-800 p-5 text-slate-50">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-400">
            Control
          </p>
          <p className="mt-4 text-2xl font-semibold">Choose where to focus.</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Use the overview for orientation, then open a workspace or project when it’s time to act.
          </p>
          <div className="mt-6 grid gap-3">
            <Link
              className="tf-btn-ghost"
              href="/"
            >
              Landing page
            </Link>
            <Link
              className="tf-btn-ghost"
              href="/settings/billing"
            >
              Billing
            </Link>
            <button
              className="tf-btn-secondary border-white/15 bg-white text-slate-900 hover:border-white/20"
              onClick={onLogout}
              type="button"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
