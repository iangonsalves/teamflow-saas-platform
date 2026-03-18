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
    <header className="rounded-[2.25rem] border border-slate-900/10 bg-white/82 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.09)] backdrop-blur">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_340px]">
        <div className="rounded-[2rem] border border-slate-900/10 bg-[linear-gradient(135deg,_#fcfaf5_0%,_#f4ead8_100%)] p-6">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-slate-500">
            TeamFlow Operations
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            {user ? `${user.name}, here is the state of your team.` : "Workspace overview"}
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            The overview is now a true command surface: pick the right workspace, scan current
            movement, and jump into workspace or project pages only when you need to act.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-white/82 p-4">
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
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-white/82 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Projects
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{projectCount}</p>
              <p className="mt-1 text-sm text-slate-600">
                Delivery lanes in the selected workspace
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-white/82 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Tasks
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{taskCount}</p>
              <p className="mt-1 text-sm text-slate-600">{activeTaskCount} still in motion</p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-900/10 bg-white/82 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Team
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{memberCount}</p>
              <p className="mt-1 text-sm text-slate-600">{user?.email ?? "Signed-in user"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] bg-slate-900 p-6 text-slate-50 shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-400">
            Control
          </p>
          <p className="mt-4 text-2xl font-semibold">Choose where to focus.</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Use the overview for orientation, then open a workspace or project when it’s time to act.
          </p>
          <div className="mt-6 grid gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
              href="/"
            >
              Landing page
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-transparent px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              href="/settings/billing"
            >
              Billing
            </Link>
            <button
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-200"
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
