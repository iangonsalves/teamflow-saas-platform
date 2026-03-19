import type { TaskPriority, TaskStatus, WorkspaceRole } from "./types";

export const taskStatuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
export const taskPriorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

export function formatRole(role: WorkspaceRole | null) {
  if (!role) {
    return "No role";
  }

  return role.charAt(0) + role.slice(1).toLowerCase();
}

export function formatStatus(status: TaskStatus) {
  if (status === "IN_PROGRESS") {
    return "In progress";
  }

  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function formatPriority(priority: TaskPriority) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

export function getPriorityClasses(priority: TaskPriority) {
  if (priority === "HIGH") {
    return "border-[#e76f51]/35 bg-[#fff0eb] text-[#a13f24]";
  }

  if (priority === "MEDIUM") {
    return "border-[#d4a373]/35 bg-[#fff8ef] text-[#8d5b28]";
  }

  return "border-[#2a9d8f]/25 bg-[#edf8f5] text-[#1f6c63]";
}

export function getStatusCardClasses(status: TaskStatus) {
  if (status === "DONE") {
    return "bg-[linear-gradient(180deg,_#e8f6f1_0%,_#f5fbf8_100%)]";
  }

  if (status === "IN_PROGRESS") {
    return "bg-[linear-gradient(180deg,_#fff1e5_0%,_#fff8f1_100%)]";
  }

  return "bg-[linear-gradient(180deg,_#f7f5f0_0%,_#fffdf8_100%)]";
}

export function formatAuditAction(action: string) {
  return action
    .split(".")
    .map((segment) =>
      segment
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
    )
    .join(" · ");
}
