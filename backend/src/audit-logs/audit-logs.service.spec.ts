import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsService', () => {
  let service: AuditLogsService;

  const prismaService = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
  });

  it('writes an audit event', async () => {
    prismaService.auditLog.create.mockResolvedValue({ id: 'log-1' });

    await expect(
      service.logEvent({
        workspaceId: 'workspace-1',
        actorUserId: 'user-1',
        entityType: 'task',
        entityId: 'task-1',
        action: 'task.created',
      }),
    ).resolves.toEqual({ id: 'log-1' });
  });

  it('lists recent workspace audit logs', async () => {
    prismaService.auditLog.findMany.mockResolvedValue([{ id: 'log-1' }]);

    await expect(service.listWorkspaceAuditLogs('workspace-1')).resolves.toEqual([
      { id: 'log-1' },
    ]);
  });
});
