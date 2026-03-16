import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddWorkspaceMemberDto } from './dto/add-workspace-member.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceMemberRoleDto } from './dto/update-workspace-member-role.dto';
import { WorkspaceAccessService } from './workspace-access.service';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async createWorkspace(
    createWorkspaceDto: CreateWorkspaceDto,
    user: AuthenticatedUser,
  ) {
    const name = createWorkspaceDto.name.trim();

    const workspace = await this.prisma.$transaction(async (tx) => {
      const createdWorkspace = await tx.workspace.create({
        data: {
          name,
          ownerId: user.sub,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: createdWorkspace.id,
          userId: user.sub,
          role: WorkspaceRole.OWNER,
        },
      });

      await this.auditLogsService.logEvent(
        {
          workspaceId: createdWorkspace.id,
          actorUserId: user.sub,
          entityType: 'workspace',
          entityId: createdWorkspace.id,
          action: 'workspace.created',
          metadata: {
            name,
          },
        },
        tx,
      );

      return tx.workspace.findUniqueOrThrow({
        where: { id: createdWorkspace.id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    });

    return workspace;
  }

  async listUserWorkspaces(user: AuthenticatedUser) {
    return this.prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId: user.sub,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        members: {
          where: {
            userId: user.sub,
          },
          select: {
            role: true,
          },
        },
      },
    });
  }

  async getWorkspaceById(workspaceId: string, user: AuthenticatedUser) {
    await this.workspaceAccessService.assertWorkspaceExists(workspaceId);
    await this.workspaceAccessService.getMembershipOrThrow(workspaceId, user.sub);

    return this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async listWorkspaceMembers(workspaceId: string, user: AuthenticatedUser) {
    await this.workspaceAccessService.assertWorkspaceExists(workspaceId);
    await this.workspaceAccessService.getMembershipOrThrow(workspaceId, user.sub);

    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async addWorkspaceMember(
    workspaceId: string,
    addWorkspaceMemberDto: AddWorkspaceMemberDto,
    user: AuthenticatedUser,
  ) {
    const actingMembership = await this.workspaceAccessService.assertCanManageMembers(
      workspaceId,
      user,
    );
    const email = addWorkspaceMemberDto.email.toLowerCase().trim();

    const targetUser = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User with this email was not found.');
    }

    const existingMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException('This user is already a workspace member.');
    }

    if (
      actingMembership.role === WorkspaceRole.ADMIN &&
      addWorkspaceMemberDto.role === WorkspaceRole.OWNER
    ) {
      throw new ForbiddenException('Admins cannot assign the owner role.');
    }

    const membership = await this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: targetUser.id,
        role: addWorkspaceMemberDto.role,
      },
      include: {
        user: {
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
      entityType: 'workspace_member',
      entityId: membership.id,
      action: 'workspace.member_added',
      metadata: {
        memberUserId: targetUser.id,
        memberEmail: targetUser.email,
        role: addWorkspaceMemberDto.role,
      },
    });

    return membership;
  }

  async updateWorkspaceMemberRole(
    workspaceId: string,
    memberUserId: string,
    updateWorkspaceMemberRoleDto: UpdateWorkspaceMemberRoleDto,
    user: AuthenticatedUser,
  ) {
    const actingMembership = await this.workspaceAccessService.assertCanManageMembers(
      workspaceId,
      user,
    );
    const targetMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('Workspace member not found.');
    }

    if (targetMembership.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Owner role cannot be reassigned here.');
    }

    if (
      actingMembership.role === WorkspaceRole.ADMIN &&
      updateWorkspaceMemberRoleDto.role === WorkspaceRole.OWNER
    ) {
      throw new ForbiddenException('Admins cannot assign the owner role.');
    }

    const updatedMembership = await this.prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId,
        },
      },
      data: {
        role: updateWorkspaceMemberRoleDto.role,
      },
      include: {
        user: {
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
      entityType: 'workspace_member',
      entityId: updatedMembership.id,
      action: 'workspace.member_role_updated',
      metadata: {
        memberUserId,
        role: updateWorkspaceMemberRoleDto.role,
      },
    });

    return updatedMembership;
  }

  async removeWorkspaceMember(
    workspaceId: string,
    memberUserId: string,
    user: AuthenticatedUser,
  ) {
    const actingMembership = await this.workspaceAccessService.assertCanManageMembers(
      workspaceId,
      user,
    );
    const targetMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId,
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('Workspace member not found.');
    }

    if (targetMembership.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Workspace owners cannot be removed.');
    }

    if (
      actingMembership.role === WorkspaceRole.ADMIN &&
      targetMembership.role === WorkspaceRole.ADMIN
    ) {
      throw new ForbiddenException('Admins cannot remove other admins.');
    }

    const removedMembershipId = targetMembership.id;

    await this.prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: memberUserId,
        },
      },
    });

    await this.auditLogsService.logEvent({
      workspaceId,
      actorUserId: user.sub,
      entityType: 'workspace_member',
      entityId: removedMembershipId,
      action: 'workspace.member_removed',
      metadata: {
        memberUserId,
      },
    });

    return { success: true };
  }
}
