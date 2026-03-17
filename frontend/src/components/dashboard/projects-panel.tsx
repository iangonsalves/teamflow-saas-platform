import type { ProjectSummary, WorkspaceSummary } from "./types";

type ProjectsPanelProps = {
  selectedWorkspace: WorkspaceSummary | null;
  selectedProject: ProjectSummary | null;
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  canManageWorkspace: boolean;
  selectedWorkspaceId: string | null;
  projectName: string;
  projectDescription: string;
  submittingProject: boolean;
  projectActionMessage: string | null;
  onSelectProject: (projectId: string) => void;
  onProjectNameChange: (value: string) => void;
  onProjectDescriptionChange: (value: string) => void;
  onCreateProject: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function ProjectsPanel({
  selectedWorkspace,
  selectedProject,
  projects,
  selectedProjectId,
  canManageWorkspace,
  selectedWorkspaceId,
  projectName,
  projectDescription,
  submittingProject,
  projectActionMessage,
  onSelectProject,
  onProjectNameChange,
  onProjectDescriptionChange,
  onCreateProject,
}: ProjectsPanelProps) {
  return (
    <section className="rounded-[2rem] border border-slate-900/10 bg-white/72 p-6 backdrop-blur">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
            Projects
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">
            {selectedWorkspace ? `Inside ${selectedWorkspace.name}` : "Choose a workspace"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Pick an active project and the task board will snap to it. Owners and
            admins can create new delivery lanes directly here.
          </p>
        </div>
        <div className="rounded-full border border-slate-900/10 bg-[#f8f2e6] px-4 py-2 text-sm text-slate-700">
          {selectedProject ? `Focused on ${selectedProject.name}` : "No project selected"}
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-3">
          {projects.length > 0 ? (
            projects.map((project) => {
              const isSelected = project.id === selectedProjectId;

              return (
                <button
                  className={`rounded-[1.5rem] border p-4 text-left transition ${
                    isSelected
                      ? "border-[#2a9d8f]/25 bg-[#edf8f5]"
                      : "border-slate-900/10 bg-white hover:border-slate-900/25"
                  }`}
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  type="button"
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
                      {isSelected ? "Open" : "View"}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-slate-900/15 bg-white px-5 py-8 text-sm text-slate-600">
              No projects yet in this workspace. Create the first one to give your
              team a track to work in.
            </div>
          )}
        </div>

        <form
          className="rounded-[1.5rem] border border-slate-900/10 bg-[#f8f2e6] p-5"
          onSubmit={onCreateProject}
        >
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
            New project
          </p>
          <input
            className="mt-4 w-full rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
            disabled={!canManageWorkspace || !selectedWorkspaceId || submittingProject}
            onChange={(event) => onProjectNameChange(event.target.value)}
            placeholder="Sprint launch"
            required
            value={projectName}
          />
          <textarea
            className="mt-3 min-h-28 w-full rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
            disabled={!canManageWorkspace || !selectedWorkspaceId || submittingProject}
            onChange={(event) => onProjectDescriptionChange(event.target.value)}
            placeholder="What is this project responsible for?"
            value={projectDescription}
          />
          <button
            className="mt-4 w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={!canManageWorkspace || !selectedWorkspaceId || submittingProject}
            type="submit"
          >
            {submittingProject ? "Creating project..." : "Create project"}
          </button>
          <p className="mt-3 text-sm text-slate-600">
            {canManageWorkspace
              ? "This becomes immediately available in the workspace project list."
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
