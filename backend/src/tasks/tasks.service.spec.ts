import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TaskStatus, WorkspaceRole } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;

  const prismaService = {
    project: {
      findFirst: jest.fn(),
    },
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    workspaceMember: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const workspaceAccessService = {
    getMembershipOrThrow: jest.fn(),
  };
  const auditLogsService = {
    logEvent: jest.fn(),
  };
  const currentUser: AuthenticatedUser = {
    sub: 'user-1',
    email: 'ian@example.com',
    name: 'Ian',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: WorkspaceAccessService,
          useValue: workspaceAccessService,
        },
        {
          provide: AuditLogsService,
          useValue: auditLogsService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('creates a task for owner or admin members', async () => {
    workspaceAccessService.getMembershipOrThrow.mockResolvedValue({
      role: WorkspaceRole.OWNER,
    });
    prismaService.project.findFirst.mockResolvedValue({
      id: 'project-1',
      workspaceId: 'workspace-1',
    });
    prismaService.task.create.mockResolvedValue({
      id: 'task-1',
      title: 'Create API docs',
    });

    await expect(
      service.createTask(
        'workspace-1',
        'project-1',
        { title: ' Create API docs ' },
        currentUser,
      ),
    ).resolves.toEqual({
      id: 'task-1',
      title: 'Create API docs',
    });
  });

  it('rejects task creation for basic members', async () => {
    workspaceAccessService.getMembershipOrThrow.mockResolvedValue({
      role: WorkspaceRole.MEMBER,
    });

    await expect(
      service.createTask(
        'workspace-1',
        'project-1',
        { title: 'Create API docs' },
        currentUser,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lists tasks with pagination metadata', async () => {
    workspaceAccessService.getMembershipOrThrow.mockResolvedValue({
      role: WorkspaceRole.MEMBER,
    });
    prismaService.project.findFirst.mockResolvedValue({
      id: 'project-1',
    });
    prismaService.$transaction.mockResolvedValue([
      [{ id: 'task-1', title: 'Create API docs' }],
      1,
    ]);

    await expect(
      service.listTasks('workspace-1', 'project-1', {}, currentUser),
    ).resolves.toEqual({
      items: [{ id: 'task-1', title: 'Create API docs' }],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('returns a task when it exists', async () => {
    workspaceAccessService.getMembershipOrThrow.mockResolvedValue({
      role: WorkspaceRole.MEMBER,
    });
    prismaService.project.findFirst.mockResolvedValue({
      id: 'project-1',
    });
    prismaService.task.findFirst.mockResolvedValue({
      id: 'task-1',
      title: 'Create API docs',
    });

    await expect(
      service.getTaskById('workspace-1', 'project-1', 'task-1', currentUser),
    ).resolves.toEqual({
      id: 'task-1',
      title: 'Create API docs',
    });
  });

  it('allows the assignee to update task status', async () => {
    workspaceAccessService.getMembershipOrThrow.mockResolvedValue({
      role: WorkspaceRole.MEMBER,
    });
    prismaService.task.findFirst.mockResolvedValue({
      id: 'task-1',
      assignedTo: 'user-1',
    });
    prismaService.task.update.mockResolvedValue({
      id: 'task-1',
      status: TaskStatus.DONE,
    });

    await expect(
      service.updateTaskStatus(
        'workspace-1',
        'project-1',
        'task-1',
        { status: TaskStatus.DONE },
        currentUser,
      ),
    ).resolves.toEqual({
      id: 'task-1',
      status: TaskStatus.DONE,
    });
  });

  it('prevents non-managers from reassigning tasks', async () => {
    workspaceAccessService.getMembershipOrThrow.mockResolvedValue({
      role: WorkspaceRole.MEMBER,
    });

    await expect(
      service.updateTaskAssignee(
        'workspace-1',
        'project-1',
        'task-1',
        { assignedTo: 'user-2' },
        currentUser,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when a task is missing', async () => {
    workspaceAccessService.getMembershipOrThrow.mockResolvedValue({
      role: WorkspaceRole.MEMBER,
    });
    prismaService.project.findFirst.mockResolvedValue({
      id: 'project-1',
    });
    prismaService.task.findFirst.mockResolvedValue(null);

    await expect(
      service.getTaskById('workspace-1', 'project-1', 'missing-task', currentUser),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
