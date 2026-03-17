import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  WorkspaceInvitationStatus,
  WorkspaceRole,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async listWorkspaceInvitations(
    workspaceId: string,
    user: AuthenticatedUser,
  ) {
    await this.workspaceAccessService.assertCanManageMembers(workspaceId, user);

    return this.prisma.workspaceInvitation.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        acceptedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async createInvitation(
    workspaceId: string,
    createInvitationDto: CreateInvitationDto,
    user: AuthenticatedUser,
  ) {
    const actingMembership = await this.workspaceAccessService.assertCanManageMembers(
      workspaceId,
      user,
    );
    const email = createInvitationDto.email.toLowerCase().trim();
    const role = createInvitationDto.role;

    if (
      actingMembership.role === WorkspaceRole.ADMIN &&
      role === WorkspaceRole.OWNER
    ) {
      throw new ForbiddenException('Admins cannot invite owners.');
    }

    const existingMembership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: {
          email,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException('This user is already a workspace member.');
    }

    const pendingInvitation = await this.prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId,
        email,
        status: WorkspaceInvitationStatus.PENDING,
      },
    });

    if (pendingInvitation) {
      throw new ConflictException('A pending invitation already exists for this email.');
    }

    const expiresInDays = Number(createInvitationDto.expiresInDays ?? '7');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invitation = await this.prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        email,
        role,
        token: randomUUID(),
        invitedByUserId: user.sub,
        expiresAt,
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await this.auditLogsService.logEvent({
      workspaceId,
      actorUserId: user.sub,
      entityType: 'workspace_invitation',
      entityId: invitation.id,
      action: 'workspace.invitation_created',
      metadata: {
        email,
        role,
        token: invitation.token,
      },
    });

    return invitation;
  }

  async acceptInvitation(
    acceptInvitationDto: AcceptInvitationDto,
    user: AuthenticatedUser,
  ) {
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { token: acceptInvitationDto.token },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found.');
    }

    if (invitation.status !== WorkspaceInvitationStatus.PENDING) {
      throw new ConflictException('This invitation is no longer active.');
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: WorkspaceInvitationStatus.EXPIRED },
      });
      throw new ConflictException('This invitation has expired.');
    }

    if (invitation.email !== user.email.toLowerCase()) {
      throw new ForbiddenException(
        'You must be logged in with the invited email address to accept this invitation.',
      );
    }

    const existingMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invitation.workspaceId,
          userId: user.sub,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException('You are already a member of this workspace.');
    }

    const acceptedAt = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const membership = await tx.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: user.sub,
          role: invitation.role,
        },
      });

      const updatedInvitation = await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: {
          status: WorkspaceInvitationStatus.ACCEPTED,
          acceptedByUserId: user.sub,
          acceptedAt,
        },
      });

      await this.auditLogsService.logEvent(
        {
          workspaceId: invitation.workspaceId,
          actorUserId: user.sub,
          entityType: 'workspace_invitation',
          entityId: invitation.id,
          action: 'workspace.invitation_accepted',
          metadata: {
            memberUserId: user.sub,
            role: invitation.role,
          },
        },
        tx,
      );

      return { membership, invitation: updatedInvitation };
    });

    return result;
  }
}
