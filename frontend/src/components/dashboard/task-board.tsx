import type { TaskPriority, TaskStatus, TaskSummary, WorkspaceMember } from "./types";
import {
  formatPriority,
  formatStatus,
  getPriorityClasses,
  getStatusCardClasses,
  taskPriorities,
  taskStatuses,
} from "./utils";

type TaskBoardProps = {
  selectedProjectName: string | null;
  selectedWorkspaceId: string | null;
  selectedProjectId: string | null;
  canManageWorkspace: boolean;
  workspaceMembers: WorkspaceMember[];
  tasks: TaskSummary[];
  projectLoading: boolean;
  taskTitle: string;
  taskDescription: string;
  taskPriority: TaskPriority;
  taskAssignee: string;
  submittingTask: boolean;
  taskActionMessage: string | null;
  updatingTaskId: string | null;
  onTaskTitleChange: (value: string) => void;
  onTaskDescriptionChange: (value: string) => void;
  onTaskPriorityChange: (value: TaskPriority) => void;
  onTaskAssigneeChange: (value: string) => void;
  onCreateTask: (event: React.FormEvent<HTMLFormElement>) => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
};

export function TaskBoard({
  selectedProjectName,
  selectedWorkspaceId,
  selectedProjectId,
  canManageWorkspace,
  workspaceMembers,
  tasks,
  projectLoading,
  taskTitle,
  taskDescription,
  taskPriority,
  taskAssignee,
  submittingTask,
  taskActionMessage,
  updatingTaskId,
  onTaskTitleChange,
  onTaskDescriptionChange,
  onTaskPriorityChange,
  onTaskAssigneeChange,
  onCreateTask,
  onTaskStatusChange,
}: TaskBoardProps) {
  return (
    <section className="rounded-[2rem] border border-slate-900/10 bg-white/72 p-6 backdrop-blur">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
            Task board
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">
            {selectedProjectName ?? "Select a project"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Move work across the board and keep assignments visible. Members can
            update their own tasks; owners and admins can drive the whole lane.
          </p>
        </div>

        <form
          className="w-full max-w-md rounded-[1.5rem] border border-slate-900/10 bg-[#f8f2e6] p-5"
          onSubmit={onCreateTask}
        >
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
            Quick task
          </p>
          <input
            className="mt-4 w-full rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
            disabled={
              !canManageWorkspace ||
              !selectedWorkspaceId ||
              !selectedProjectId ||
              submittingTask
            }
            onChange={(event) => onTaskTitleChange(event.target.value)}
            placeholder="Prepare onboarding checklist"
            required
            value={taskTitle}
          />
          <textarea
            className="mt-3 min-h-24 w-full rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
            disabled={
              !canManageWorkspace ||
              !selectedWorkspaceId ||
              !selectedProjectId ||
              submittingTask
            }
            onChange={(event) => onTaskDescriptionChange(event.target.value)}
            placeholder="Context, requirements, or next actions"
            value={taskDescription}
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <select
              className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
              disabled={
                !canManageWorkspace ||
                !selectedWorkspaceId ||
                !selectedProjectId ||
                submittingTask
              }
              onChange={(event) => onTaskPriorityChange(event.target.value as TaskPriority)}
              value={taskPriority}
            >
              {taskPriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {formatPriority(priority)}
                </option>
              ))}
            </select>
            <select
              className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
              disabled={
                !canManageWorkspace ||
                !selectedWorkspaceId ||
                !selectedProjectId ||
                submittingTask
              }
              onChange={(event) => onTaskAssigneeChange(event.target.value)}
              value={taskAssignee}
            >
              <option value="">Unassigned</option>
              {workspaceMembers.map((member) => (
                <option key={member.user.id} value={member.user.id}>
                  {member.user.name}
                </option>
              ))}
            </select>
          </div>
          <button
            className="mt-4 w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={
              !canManageWorkspace ||
              !selectedWorkspaceId ||
              !selectedProjectId ||
              submittingTask
            }
            type="submit"
          >
            {submittingTask ? "Adding task..." : "Create task"}
          </button>
        </form>
      </div>

      {taskActionMessage ? (
        <div className="mt-4 rounded-2xl border border-[#2a9d8f]/25 bg-[#edf8f5] px-4 py-3 text-sm text-[#1f6c63]">
          {taskActionMessage}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {taskStatuses.map((status) => {
          const tasksForStatus = tasks.filter((task) => task.status === status);

          return (
            <section
              className={`rounded-[1.75rem] border border-slate-900/10 p-4 ${getStatusCardClasses(status)}`}
              key={status}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                    {formatStatus(status)}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {tasksForStatus.length}
                  </p>
                </div>
                {projectLoading ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500">
                    Syncing
                  </span>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3">
                {tasksForStatus.length > 0 ? (
                  tasksForStatus.map((task) => (
                    <div
                      className="rounded-[1.5rem] border border-slate-900/10 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                      key={task.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-slate-900">
                            {task.title}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {task.description || "No description yet."}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${getPriorityClasses(task.priority)}`}
                        >
                          {task.priority}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            Assignee
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {task.assignee?.name ?? "Unassigned"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            Move task
                          </p>
                          <select
                            className="mt-1 rounded-full border border-slate-900/10 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-slate-900/30"
                            disabled={updatingTaskId === task.id}
                            onChange={(event) =>
                              onTaskStatusChange(task.id, event.target.value as TaskStatus)
                            }
                            value={task.status}
                          >
                            {taskStatuses.map((nextStatus) => (
                              <option key={nextStatus} value={nextStatus}>
                                {formatStatus(nextStatus)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-900/15 bg-white/70 px-4 py-6 text-sm text-slate-600">
                    No tasks in {formatStatus(status).toLowerCase()}.
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
