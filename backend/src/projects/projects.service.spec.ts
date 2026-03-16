import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const prismaService = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  const workspaceAccessService = {
    assertWorkspaceExists: jest.fn(),
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
        ProjectsService,
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

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('creates a project when the user is an owner or admin', async () => {
    workspaceAccessService.getMembershipOrThrow.mockResolvedValue({
      role: WorkspaceRole.OWNER,
    });
    workspaceAccessService.assertWorkspaceExists.mockResolvedValue(undefined);
    prismaService.project.create.mockResolvedValue({
      id: 'project-1',
      name: 'Website Redesign',
    });

    await expect(
      service.createProject(
        'workspace-1',
        { name: ' Website Redesign ', description: ' Refresh the UI ' },
        currentUser,
      ),
    ).resolves.toEqual({
      id: 'project-1',
      name: 'Website Redesign',
    });
  });

  it('rejects project creation for basic members', async () => {
    workspaceAccessService.getMembershipOrThrow.mockResolvedValue({
      role: WorkspaceRole.MEMBER,
    });

    await expect(
      service.createProject(
        'workspace-1',
        { name: 'Website Redesign' },
        currentUser,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lists projects for workspace members', async () => {
    workspaceAccessService.assertWorkspaceExists.mockResolvedValue(undefined);
    workspaceAccessService.getMembershipOrThrow.mockResolvedValue({
      role: WorkspaceRole.MEMBER,
    });
    prismaService.project.findMany.mockResolvedValue([
      { id: 'project-1', name: 'Website Redesign' },
    ]);

    await expect(
      service.listProjects('workspace-1', currentUser),
    ).resolves.toEqual([{ id: 'project-1', name: 'Website Redesign' }]);
  });

  it('returns a project when it exists in the workspace', async () => {
    workspaceAccessService.assertWorkspaceExists.mockResolvedValue(undefined);
    workspaceAccessService.getMembershipOrThrow.mockResolvedValue({
      role: WorkspaceRole.MEMBER,
    });
    prismaService.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Website Redesign',
    });

    await expect(
      service.getProjectById('workspace-1', 'project-1', currentUser),
    ).resolves.toEqual({
      id: 'project-1',
      name: 'Website Redesign',
    });
  });

  it('throws when the project does not exist in the workspace', async () => {
    workspaceAccessService.assertWorkspaceExists.mockResolvedValue(undefined);
    workspaceAccessService.getMembershipOrThrow.mockResolvedValue({
      role: WorkspaceRole.MEMBER,
    });
    prismaService.project.findFirst.mockResolvedValue(null);

    await expect(
      service.getProjectById('workspace-1', 'missing-project', currentUser),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
