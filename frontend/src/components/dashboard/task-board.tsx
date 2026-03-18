"use client";

import { useState } from "react";
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
  editingTaskId: string | null;
  editTitle: string;
  editDescription: string;
  editPriority: TaskPriority;
  onTaskTitleChange: (value: string) => void;
  onTaskDescriptionChange: (value: string) => void;
  onTaskPriorityChange: (value: TaskPriority) => void;
  onTaskAssigneeChange: (value: string) => void;
  onEditTitleChange: (value: string) => void;
  onEditDescriptionChange: (value: string) => void;
  onEditPriorityChange: (value: TaskPriority) => void;
  onCreateTask: (event: React.FormEvent<HTMLFormElement>) => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
  onTaskAssigneeUpdate: (taskId: string, assigneeId: string) => void;
  onStartEditingTask: (task: TaskSummary) => void;
  onCancelEditingTask: () => void;
  onSaveTaskEdit: (taskId: string) => void;
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
  editingTaskId,
  editTitle,
  editDescription,
  editPriority,
  onTaskTitleChange,
  onTaskDescriptionChange,
  onTaskPriorityChange,
  onTaskAssigneeChange,
  onEditTitleChange,
  onEditDescriptionChange,
  onEditPriorityChange,
  onCreateTask,
  onTaskStatusChange,
  onTaskAssigneeUpdate,
  onStartEditingTask,
  onCancelEditingTask,
  onSaveTaskEdit,
}: TaskBoardProps) {
  const [composerOpen, setComposerOpen] = useState(false);

  const canCreateTask =
    canManageWorkspace && Boolean(selectedWorkspaceId) && Boolean(selectedProjectId);

  return (
    <section className="rounded-[2.25rem] border border-slate-900/10 bg-white/84 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-slate-500">
            Task board
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
              {selectedProjectName ?? "Select a project"}
            </h2>
            <span className="rounded-full border border-slate-900/10 bg-[#fff7ec] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#8d5b28]">
              {tasks.length} cards
            </span>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            This board is the primary workspace for the project. Creation is available on demand,
            while movement and assignment stay visible directly inside each lane.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {projectLoading ? (
            <span className="rounded-full border border-slate-900/10 bg-white px-4 py-2 text-xs text-slate-500">
              Syncing board
            </span>
          ) : null}
          {canCreateTask ? (
            <button
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
              onClick={() => setComposerOpen((current) => !current)}
              type="button"
            >
              {composerOpen ? "Close composer" : "New task"}
            </button>
          ) : null}
        </div>
      </div>

      {taskActionMessage ? (
        <div className="mt-5 rounded-2xl border border-[#2a9d8f]/25 bg-[#edf8f5] px-4 py-3 text-sm text-[#1f6c63]">
          {taskActionMessage}
        </div>
      ) : null}

      {composerOpen ? (
        <form
          className="mt-6 rounded-[2rem] border border-[#c5b8a1] bg-[#f6efe1] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
          onSubmit={onCreateTask}
        >
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                Task composer
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Add a new card without losing sight of the board.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="grid gap-3">
              <input
                className="w-full rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
                disabled={!canCreateTask || submittingTask}
                onChange={(event) => onTaskTitleChange(event.target.value)}
                placeholder="Prepare onboarding checklist"
                required
                value={taskTitle}
              />
              <textarea
                className="min-h-28 w-full rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
                disabled={!canCreateTask || submittingTask}
                onChange={(event) => onTaskDescriptionChange(event.target.value)}
                placeholder="Context, requirements, or next actions"
                value={taskDescription}
              />
            </div>

            <div className="grid gap-3">
              <select
                className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
                disabled={!canCreateTask || submittingTask}
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
                disabled={!canCreateTask || submittingTask}
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
              <button
                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={!canCreateTask || submittingTask}
                type="submit"
              >
                {submittingTask ? "Adding task..." : "Create task"}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      <div className="mt-6 grid gap-4 2xl:grid-cols-3">
        {taskStatuses.map((status) => {
          const tasksForStatus = tasks.filter((task) => task.status === status);

          return (
            <section
              className={`rounded-[2rem] border border-slate-900/10 p-4 ${getStatusCardClasses(status)}`}
              key={status}
            >
              <div className="flex items-center justify-between gap-4 rounded-[1.5rem] bg-white/72 px-4 py-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                    {formatStatus(status)}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {tasksForStatus.length}
                  </p>
                </div>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white">
                  Lane
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                {tasksForStatus.length > 0 ? (
                  tasksForStatus.map((task) => (
                    <div
                      className="rounded-[1.6rem] border border-slate-900/10 bg-white p-4 shadow-[0_16px_30px_rgba(15,23,42,0.08)]"
                      key={task.id}
                    >
                      {editingTaskId === task.id ? (
                        <div className="space-y-4">
                          <input
                            className="w-full rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
                            onChange={(event) => onEditTitleChange(event.target.value)}
                            value={editTitle}
                          />
                          <textarea
                            className="min-h-24 w-full rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
                            onChange={(event) => onEditDescriptionChange(event.target.value)}
                            value={editDescription}
                          />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <select
                              className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
                              onChange={(event) =>
                                onEditPriorityChange(event.target.value as TaskPriority)
                              }
                              value={editPriority}
                            >
                              {taskPriorities.map((priority) => (
                                <option key={priority} value={priority}>
                                  {formatPriority(priority)}
                                </option>
                              ))}
                            </select>
                            <select
                              className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900/30"
                              onChange={(event) =>
                                onTaskAssigneeUpdate(task.id, event.target.value)
                              }
                              value={task.assignee?.id ?? ""}
                            >
                              <option value="">Unassigned</option>
                              {workspaceMembers.map((member) => (
                                <option key={member.user.id} value={member.user.id}>
                                  {member.user.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-3">
                            <button
                              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                              onClick={() => onSaveTaskEdit(task.id)}
                              type="button"
                            >
                              Save
                            </button>
                            <button
                              className="rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                              onClick={onCancelEditingTask}
                              type="button"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2">
                              <p className="text-base font-semibold text-slate-900">
                                {task.title}
                              </p>
                              <p className="text-sm leading-6 text-slate-600">
                                {task.description || "No description yet."}
                              </p>
                            </div>
                            <span
                              className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${getPriorityClasses(task.priority)}`}
                            >
                              {task.priority}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 rounded-[1.25rem] bg-[#f8f6f1] p-3 sm:grid-cols-2">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                                Assignee
                              </p>
                              {canManageWorkspace ? (
                                <select
                                  className="mt-1 w-full rounded-full border border-slate-900/10 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-slate-900/30"
                                  disabled={updatingTaskId === task.id}
                                  onChange={(event) =>
                                    onTaskAssigneeUpdate(task.id, event.target.value)
                                  }
                                  value={task.assignee?.id ?? ""}
                                >
                                  <option value="">Unassigned</option>
                                  {workspaceMembers.map((member) => (
                                    <option key={member.user.id} value={member.user.id}>
                                      {member.user.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <p className="mt-1 text-sm font-medium text-slate-900">
                                  {task.assignee?.name ?? "Unassigned"}
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                                Move task
                              </p>
                              <select
                                className="mt-1 w-full rounded-full border border-slate-900/10 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-slate-900/30"
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

                          {canManageWorkspace ? (
                            <div className="mt-4 flex justify-end">
                              <button
                                className="rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                                onClick={() => onStartEditingTask(task)}
                                type="button"
                              >
                                Edit task
                              </button>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-900/15 bg-white/75 px-4 py-8 text-sm text-slate-600">
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
