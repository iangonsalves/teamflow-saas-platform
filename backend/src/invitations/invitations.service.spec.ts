import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  WorkspaceInvitationStatus,
  WorkspaceRole,
} from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { InvitationsService } from './invitations.service';

describe('InvitationsService', () => {
  let service: InvitationsService;

  const prismaService = {
    workspaceMember: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    workspaceInvitation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const workspaceAccessService = {
    assertCanManageMembers: jest.fn(),
  };
  const auditLogsService = {
    logEvent: jest.fn(),
  };
  const currentUser: AuthenticatedUser = {
    sub: 'user-1',
    email: 'owner@example.com',
    name: 'Owner',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
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

    service = module.get<InvitationsService>(InvitationsService);
  });

  it('creates an invitation for a workspace', async () => {
    workspaceAccessService.assertCanManageMembers.mockResolvedValue({
      role: WorkspaceRole.OWNER,
    });
    prismaService.workspaceMember.findFirst.mockResolvedValue(null);
    prismaService.workspaceInvitation.findFirst.mockResolvedValue(null);
    prismaService.workspaceInvitation.create.mockResolvedValue({
      id: 'invite-1',
      token: 'token-123',
    });

    await expect(
      service.createInvitation(
        'workspace-1',
        { email: 'member@example.com', role: WorkspaceRole.MEMBER },
        currentUser,
      ),
    ).resolves.toEqual({
      id: 'invite-1',
      token: 'token-123',
    });
  });

  it('rejects duplicate pending invitations', async () => {
    workspaceAccessService.assertCanManageMembers.mockResolvedValue({
      role: WorkspaceRole.OWNER,
    });
    prismaService.workspaceMember.findFirst.mockResolvedValue(null);
    prismaService.workspaceInvitation.findFirst.mockResolvedValue({
      id: 'invite-1',
    });

    await expect(
      service.createInvitation(
        'workspace-1',
        { email: 'member@example.com', role: WorkspaceRole.MEMBER },
        currentUser,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('accepts a valid invitation', async () => {
    prismaService.workspaceInvitation.findUnique.mockResolvedValue({
      id: 'invite-1',
      workspaceId: 'workspace-1',
      email: 'owner@example.com',
      role: WorkspaceRole.MEMBER,
      status: WorkspaceInvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 86400000),
    });
    prismaService.workspaceMember.findUnique.mockResolvedValue(null);
    prismaService.$transaction.mockImplementation(async (callback) =>
      callback({
        workspaceMember: {
          create: jest.fn().mockResolvedValue({ id: 'membership-1' }),
        },
        workspaceInvitation: {
          update: jest.fn().mockResolvedValue({ id: 'invite-1' }),
        },
      }),
    );

    await expect(
      service.acceptInvitation({ token: 'token-123' }, currentUser),
    ).resolves.toMatchObject({
      membership: { id: 'membership-1' },
      invitation: { id: 'invite-1' },
    });
  });

  it('rejects invitation acceptance for the wrong email', async () => {
    prismaService.workspaceInvitation.findUnique.mockResolvedValue({
      id: 'invite-1',
      workspaceId: 'workspace-1',
      email: 'different@example.com',
      role: WorkspaceRole.MEMBER,
      status: WorkspaceInvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 86400000),
    });

    await expect(
      service.acceptInvitation({ token: 'token-123' }, currentUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when invitation token is not found', async () => {
    prismaService.workspaceInvitation.findUnique.mockResolvedValue(null);

    await expect(
      service.acceptInvitation({ token: 'token-123' }, currentUser),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
