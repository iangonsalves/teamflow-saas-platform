import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

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
    const workspace = await this.prisma.workspace.findUnique({
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

    if (!workspace) {
      throw new NotFoundException('Workspace not found.');
    }

    const isMember = workspace.members.some(
      (member) => member.userId === user.sub,
    );

    if (!isMember) {
      throw new ForbiddenException('You do not have access to this workspace.');
    }

    return workspace;
  }
}
