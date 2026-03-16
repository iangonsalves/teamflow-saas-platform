import { Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type LogAuditEventInput = {
  workspaceId: string;
  actorUserId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async logEvent(
    input: LogAuditEventInput,
    prismaClient?: Prisma.TransactionClient | PrismaClient,
  ) {
    const db = prismaClient ?? this.prisma;

    return db.auditLog.create({
      data: {
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        metadata: input.metadata,
      },
    });
  }

  async listWorkspaceAuditLogs(workspaceId: string) {
    return this.prisma.auditLog.findMany({
      where: { workspaceId },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 100,
    });
  }
}
