import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TaskStatus, WorkspaceRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskAssigneeDto } from './dto/update-task-assignee.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async createTask(
    workspaceId: string,
    projectId: string,
    createTaskDto: CreateTaskDto,
    user: AuthenticatedUser,
  ) {
    const membership = await this.workspaceAccessService.getMembershipOrThrow(
      workspaceId,
      user.sub,
    );

    if (
      membership.role !== WorkspaceRole.OWNER &&
      membership.role !== WorkspaceRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only workspace owners and admins can create tasks.',
      );
    }

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
      },
      select: {
        id: true,
        workspaceId: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    if (createTaskDto.assignedTo) {
      await this.assertWorkspaceMember(workspaceId, createTaskDto.assignedTo);
    }

    const task = await this.prisma.task.create({
      data: {
        projectId,
        title: createTaskDto.title.trim(),
        description: createTaskDto.description?.trim() || null,
        priority: createTaskDto.priority,
        assignedTo: createTaskDto.assignedTo ?? null,
        dueDate: createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : null,
        createdBy: user.sub,
      },
      include: this.taskInclude,
    });

    await this.auditLogsService.logEvent({
      workspaceId,
      actorUserId: user.sub,
      entityType: 'task',
      entityId: task.id,
      action: 'task.created',
      metadata: {
        title: task.title,
        projectId,
        assignedTo: task.assignedTo,
      },
    });

    return task;
  }

  async listTasks(
    workspaceId: string,
    projectId: string,
    query: ListTasksQueryDto,
    user: AuthenticatedUser,
  ) {
    await this.workspaceAccessService.getMembershipOrThrow(workspaceId, user.sub);
    await this.assertProjectInWorkspace(workspaceId, projectId);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where = {
      projectId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.assignedTo ? { assignedTo: query.assignedTo } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: this.taskInclude,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getTaskById(
    workspaceId: string,
    projectId: string,
    taskId: string,
    user: AuthenticatedUser,
  ) {
    await this.workspaceAccessService.getMembershipOrThrow(workspaceId, user.sub);
    await this.assertProjectInWorkspace(workspaceId, projectId);

    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
      },
      include: this.taskInclude,
    });

    if (!task) {
      throw new NotFoundException('Task not found.');
    }

    return task;
  }

  async updateTaskStatus(
    workspaceId: string,
    projectId: string,
    taskId: string,
    updateTaskStatusDto: UpdateTaskStatusDto,
    user: AuthenticatedUser,
  ) {
    const membership = await this.workspaceAccessService.getMembershipOrThrow(
      workspaceId,
      user.sub,
    );
    const task = await this.findTaskOrThrow(projectId, taskId);

    const canManage =
      membership.role === WorkspaceRole.OWNER ||
      membership.role === WorkspaceRole.ADMIN;
    const isAssignee = task.assignedTo === user.sub;

    if (!canManage && !isAssignee) {
      throw new ForbiddenException(
        'Only workspace owners, admins, or the assignee can update task status.',
      );
    }

    const updatedTask = await this.prisma.task.update({
      where: { id: task.id },
      data: {
        status: updateTaskStatusDto.status,
      },
      include: this.taskInclude,
    });

    await this.auditLogsService.logEvent({
      workspaceId,
      actorUserId: user.sub,
      entityType: 'task',
      entityId: updatedTask.id,
      action: 'task.status_updated',
      metadata: {
        previousStatus: task.status,
        nextStatus: updateTaskStatusDto.status,
      },
    });

    return updatedTask;
  }

  async updateTaskAssignee(
    workspaceId: string,
    projectId: string,
    taskId: string,
    updateTaskAssigneeDto: UpdateTaskAssigneeDto,
    user: AuthenticatedUser,
  ) {
    const membership = await this.workspaceAccessService.getMembershipOrThrow(
      workspaceId,
      user.sub,
    );

    if (
      membership.role !== WorkspaceRole.OWNER &&
      membership.role !== WorkspaceRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only workspace owners and admins can reassign tasks.',
      );
    }

    const task = await this.findTaskOrThrow(projectId, taskId);

    if (updateTaskAssigneeDto.assignedTo) {
      await this.assertWorkspaceMember(workspaceId, updateTaskAssigneeDto.assignedTo);
    }

    const updatedTask = await this.prisma.task.update({
      where: { id: task.id },
      data: {
        assignedTo: updateTaskAssigneeDto.assignedTo ?? null,
      },
      include: this.taskInclude,
    });

    await this.auditLogsService.logEvent({
      workspaceId,
      actorUserId: user.sub,
      entityType: 'task',
      entityId: updatedTask.id,
      action: 'task.assignee_updated',
      metadata: {
        previousAssignedTo: task.assignedTo,
        nextAssignedTo: updateTaskAssigneeDto.assignedTo ?? null,
      },
    });

    return updatedTask;
  }

  private async assertProjectInWorkspace(workspaceId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
      },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return project;
  }

  private async findTaskOrThrow(projectId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
      },
      include: this.taskInclude,
    });

    if (!task) {
      throw new NotFoundException('Task not found.');
    }

    return task;
  }

  private async assertWorkspaceMember(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException(
        'Assigned user is not a member of this workspace.',
      );
    }
  }

  private readonly taskInclude = {
    assignee: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    creator: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  };
}
