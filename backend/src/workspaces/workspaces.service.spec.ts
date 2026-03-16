import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from './workspace-access.service';
import { WorkspacesService } from './workspaces.service';

describe('WorkspacesService', () => {
  let service: WorkspacesService;

  const prismaService = {
    $transaction: jest.fn(),
    workspace: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    workspaceMember: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };
  const workspaceAccessService = {
    assertWorkspaceExists: jest.fn(),
    getMembershipOrThrow: jest.fn(),
    assertCanManageMembers: jest.fn(),
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
        WorkspacesService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: WorkspaceAccessService,
          useValue: workspaceAccessService,
        },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
  });

  it('creates a workspace and the owner membership together', async () => {
    const tx = {
      workspace: {
        create: jest.fn().mockResolvedValue({ id: 'workspace-1' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'workspace-1',
          name: 'TeamFlow',
          members: [
            {
              role: WorkspaceRole.OWNER,
              user: {
                id: 'user-1',
                name: 'Ian',
                email: 'ian@example.com',
              },
            },
          ],
        }),
      },
      workspaceMember: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    prismaService.$transaction.mockImplementation(async (callback) => callback(tx));

    await expect(
      service.createWorkspace({ name: ' TeamFlow ' }, currentUser),
    ).resolves.toEqual({
      id: 'workspace-1',
      name: 'TeamFlow',
      members: [
        {
          role: WorkspaceRole.OWNER,
          user: {
            id: 'user-1',
            name: 'Ian',
            email: 'ian@example.com',
          },
        },
      ],
    });
  });

  it('lists workspaces for the current user', async () => {
    prismaService.workspace.findMany.mockResolvedValue([
      { id: 'workspace-1', name: 'TeamFlow' },
    ]);

    await expect(service.listUserWorkspaces(currentUser)).resolves.toEqual([
      { id: 'workspace-1', name: 'TeamFlow' },
    ]);
  });

  it('returns a workspace when the user is a member', async () => {
    workspaceAccessService.assertWorkspaceExists.mockResolvedValue(undefined);
    workspaceAccessService.getMembershipOrThrow.mockResolvedValue({
      role: WorkspaceRole.MEMBER,
    });
    prismaService.workspace.findUniqueOrThrow.mockResolvedValue({
      id: 'workspace-1',
      members: [{ userId: 'user-1' }],
    });

    await expect(
      service.getWorkspaceById('workspace-1', currentUser),
    ).resolves.toEqual({
      id: 'workspace-1',
      members: [{ userId: 'user-1' }],
    });
  });

  it('throws when the workspace does not exist', async () => {
    workspaceAccessService.assertWorkspaceExists.mockRejectedValue(
      new NotFoundException(),
    );

    await expect(
      service.getWorkspaceById('missing-workspace', currentUser),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when the user is not a workspace member', async () => {
    workspaceAccessService.assertWorkspaceExists.mockResolvedValue(undefined);
    workspaceAccessService.getMembershipOrThrow.mockRejectedValue(
      new ForbiddenException(),
    );

    await expect(
      service.getWorkspaceById('workspace-1', currentUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lists workspace members for an authorized user', async () => {
    workspaceAccessService.assertWorkspaceExists.mockResolvedValue(undefined);
    workspaceAccessService.getMembershipOrThrow.mockResolvedValue({
      role: WorkspaceRole.MEMBER,
    });
    prismaService.workspaceMember.findMany.mockResolvedValue([
      { userId: 'user-1', role: WorkspaceRole.OWNER },
    ]);

    await expect(
      service.listWorkspaceMembers('workspace-1', currentUser),
    ).resolves.toEqual([{ userId: 'user-1', role: WorkspaceRole.OWNER }]);
  });

  it('adds a member when an owner or admin manages the workspace', async () => {
    workspaceAccessService.assertCanManageMembers.mockResolvedValue({
      role: WorkspaceRole.OWNER,
    });
    prismaService.user.findUnique.mockResolvedValue({
      id: 'user-2',
      name: 'Alex',
      email: 'alex@example.com',
    });
    prismaService.workspaceMember.findUnique.mockResolvedValue(null);
    prismaService.workspaceMember.create.mockResolvedValue({
      userId: 'user-2',
      role: WorkspaceRole.MEMBER,
    });

    await expect(
      service.addWorkspaceMember(
        'workspace-1',
        { email: 'alex@example.com', role: WorkspaceRole.MEMBER },
        currentUser,
      ),
    ).resolves.toEqual({
      userId: 'user-2',
      role: WorkspaceRole.MEMBER,
    });
  });

  it('rejects adding a duplicate workspace member', async () => {
    workspaceAccessService.assertCanManageMembers.mockResolvedValue({
      role: WorkspaceRole.OWNER,
    });
    prismaService.user.findUnique.mockResolvedValue({
      id: 'user-2',
      name: 'Alex',
      email: 'alex@example.com',
    });
    prismaService.workspaceMember.findUnique.mockResolvedValue({
      userId: 'user-2',
    });

    await expect(
      service.addWorkspaceMember(
        'workspace-1',
        { email: 'alex@example.com', role: WorkspaceRole.MEMBER },
        currentUser,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates a member role when allowed', async () => {
    workspaceAccessService.assertCanManageMembers.mockResolvedValue({
      role: WorkspaceRole.OWNER,
    });
    prismaService.workspaceMember.findUnique.mockResolvedValue({
      userId: 'user-2',
      role: WorkspaceRole.MEMBER,
      user: {
        id: 'user-2',
        name: 'Alex',
        email: 'alex@example.com',
      },
    });
    prismaService.workspaceMember.update.mockResolvedValue({
      userId: 'user-2',
      role: WorkspaceRole.ADMIN,
    });

    await expect(
      service.updateWorkspaceMemberRole(
        'workspace-1',
        'user-2',
        { role: WorkspaceRole.ADMIN },
        currentUser,
      ),
    ).resolves.toEqual({
      userId: 'user-2',
      role: WorkspaceRole.ADMIN,
    });
  });

  it('prevents changing the owner role', async () => {
    workspaceAccessService.assertCanManageMembers.mockResolvedValue({
      role: WorkspaceRole.OWNER,
    });
    prismaService.workspaceMember.findUnique.mockResolvedValue({
      userId: 'user-2',
      role: WorkspaceRole.OWNER,
      user: {
        id: 'user-2',
        name: 'Alex',
        email: 'alex@example.com',
      },
    });

    await expect(
      service.updateWorkspaceMemberRole(
        'workspace-1',
        'user-2',
        { role: WorkspaceRole.ADMIN },
        currentUser,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('removes a non-owner workspace member', async () => {
    workspaceAccessService.assertCanManageMembers.mockResolvedValue({
      role: WorkspaceRole.OWNER,
    });
    prismaService.workspaceMember.findUnique.mockResolvedValue({
      userId: 'user-2',
      role: WorkspaceRole.MEMBER,
    });
    prismaService.workspaceMember.delete.mockResolvedValue({});

    await expect(
      service.removeWorkspaceMember('workspace-1', 'user-2', currentUser),
    ).resolves.toEqual({ success: true });
  });

  it('prevents removing the workspace owner', async () => {
    workspaceAccessService.assertCanManageMembers.mockResolvedValue({
      role: WorkspaceRole.OWNER,
    });
    prismaService.workspaceMember.findUnique.mockResolvedValue({
      userId: 'user-2',
      role: WorkspaceRole.OWNER,
    });

    await expect(
      service.removeWorkspaceMember('workspace-1', 'user-2', currentUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
