"use client";

import Link from "next/link";
import type { ProjectSummary } from "./dashboard/types";

type WorkspaceProjectsPanelProps = {
  workspaceId: string;
  workspaceName: string | null;
  projects: ProjectSummary[];
  canManageWorkspace: boolean;
  projectName: string;
  projectDescription: string;
  submittingProject: boolean;
  projectActionMessage: string | null;
  onProjectNameChange: (value: string) => void;
  onProjectDescriptionChange: (value: string) => void;
  onCreateProject: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function WorkspaceProjectsPanel({
  workspaceId,
  workspaceName,
  projects,
  canManageWorkspace,
  projectName,
  projectDescription,
  submittingProject,
  projectActionMessage,
  onProjectNameChange,
  onProjectDescriptionChange,
  onCreateProject,
}: WorkspaceProjectsPanelProps) {
  return (
    <section className="rounded-[2.15rem] border border-slate-900/10 bg-white/84 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
            Projects
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">
            {workspaceName ? `Inside ${workspaceName}` : "Workspace projects"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            This is the planning surface for the workspace. Open any project to move into its dedicated board.
          </p>
        </div>
        <div className="rounded-full border border-slate-900/10 bg-[#fff7ec] px-4 py-2 text-sm text-[#8d5b28]">
          {projects.length} active {projects.length === 1 ? "project" : "projects"}
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-3">
          {projects.length > 0 ? (
            projects.map((project) => (
              <Link
                className="rounded-[1.65rem] border border-slate-900/10 bg-[#fffdfa] p-5 text-left no-underline transition hover:border-slate-900/25 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
                href={`/projects/${project.id}?workspaceId=${workspaceId}`}
                key={project.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {project.name}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {project.description || "No description yet."}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white">
                    Open
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-slate-900/15 bg-[#fffdfa] px-5 py-8 text-sm text-slate-600">
              No projects yet in this workspace. Create the first one to give your team a track to work in.
            </div>
          )}
        </div>

        <form
          className="rounded-[1.85rem] border border-[#c5b8a1] bg-[#f6efe1] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
          onSubmit={onCreateProject}
        >
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
            Project composer
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Create a fresh delivery lane without leaving this workspace.
          </p>
          <input
            className="mt-4 w-full rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
            disabled={!canManageWorkspace || submittingProject}
            onChange={(event) => onProjectNameChange(event.target.value)}
            placeholder="Sprint launch"
            required
            value={projectName}
          />
          <textarea
            className="mt-3 min-h-28 w-full rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
            disabled={!canManageWorkspace || submittingProject}
            onChange={(event) => onProjectDescriptionChange(event.target.value)}
            placeholder="What is this project responsible for?"
            value={projectDescription}
          />
          <button
            className="mt-4 w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={!canManageWorkspace || submittingProject}
            type="submit"
          >
            {submittingProject ? "Creating project..." : "Create project"}
          </button>
          <p className="mt-3 text-sm text-slate-600">
            {canManageWorkspace
              ? "New projects become available immediately in this workspace."
              : "Owners and admins can create projects from this panel."}
          </p>
        </form>
      </div>

      {projectActionMessage ? (
        <div className="mt-4 rounded-2xl border border-[#2a9d8f]/25 bg-[#edf8f5] px-4 py-3 text-sm text-[#1f6c63]">
          {projectActionMessage}
        </div>
      ) : null}
    </section>
  );
}
