import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccessService: WorkspaceAccessService,
  ) {}

  async createProject(
    workspaceId: string,
    createProjectDto: CreateProjectDto,
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
        'Only workspace owners and admins can create projects.',
      );
    }

    await this.workspaceAccessService.assertWorkspaceExists(workspaceId);

    return this.prisma.project.create({
      data: {
        workspaceId,
        name: createProjectDto.name.trim(),
        description: createProjectDto.description?.trim() || null,
        createdBy: user.sub,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async listProjects(workspaceId: string, user: AuthenticatedUser) {
    await this.workspaceAccessService.assertWorkspaceExists(workspaceId);
    await this.workspaceAccessService.getMembershipOrThrow(workspaceId, user.sub);

    return this.prisma.project.findMany({
      where: { workspaceId },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getProjectById(
    workspaceId: string,
    projectId: string,
    user: AuthenticatedUser,
  ) {
    await this.workspaceAccessService.assertWorkspaceExists(workspaceId);
    await this.workspaceAccessService.getMembershipOrThrow(workspaceId, user.sub);

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return project;
  }
}
