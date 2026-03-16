import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from './workspaces.service';

describe('WorkspacesService', () => {
  let service: WorkspacesService;

  const prismaService = {
    $transaction: jest.fn(),
    workspace: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
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
    prismaService.workspace.findUnique.mockResolvedValue({
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
    prismaService.workspace.findUnique.mockResolvedValue(null);

    await expect(
      service.getWorkspaceById('missing-workspace', currentUser),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when the user is not a workspace member', async () => {
    prismaService.workspace.findUnique.mockResolvedValue({
      id: 'workspace-1',
      members: [{ userId: 'another-user' }],
    });

    await expect(
      service.getWorkspaceById('workspace-1', currentUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
