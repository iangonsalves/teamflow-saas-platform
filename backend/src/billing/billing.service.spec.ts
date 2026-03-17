import {
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  WorkspaceRole,
} from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { BillingService } from './billing.service';

describe('BillingService', () => {
  let service: BillingService;
  let originalProPrice: string | undefined;
  let originalTeamPrice: string | undefined;
  const prismaService = {
    subscription: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    workspace: {
      findUnique: jest.fn(),
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
    name: 'Owner',
    email: 'owner@example.com',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    originalProPrice = process.env.STRIPE_PRICE_PRO_MONTHLY;
    originalTeamPrice = process.env.STRIPE_PRICE_TEAM_MONTHLY;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prismaService },
        { provide: WorkspaceAccessService, useValue: workspaceAccessService },
        { provide: AuditLogsService, useValue: auditLogsService },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  afterEach(() => {
    process.env.STRIPE_PRICE_PRO_MONTHLY = originalProPrice;
    process.env.STRIPE_PRICE_TEAM_MONTHLY = originalTeamPrice;
  });

  it('returns default subscription state when no subscription exists', async () => {
    workspaceAccessService.assertWorkspaceExists.mockResolvedValue(undefined);
    workspaceAccessService.getMembershipOrThrow.mockResolvedValue({
      role: WorkspaceRole.OWNER,
    });
    prismaService.subscription.findUnique.mockResolvedValue(null);

    await expect(
      service.getWorkspaceSubscription('workspace-1', currentUser),
    ).resolves.toEqual({
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.INACTIVE,
      stripeCustomerId: null,
      stripeSubId: null,
    });
  });

  it('rejects checkout for non-admin members', async () => {
    workspaceAccessService.getMembershipOrThrow.mockResolvedValue({
      role: WorkspaceRole.MEMBER,
    });

    await expect(
      service.createCheckoutSession(
        'workspace-1',
        { plan: SubscriptionPlan.PRO },
        currentUser,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws a config error when Stripe price IDs are missing', async () => {
    process.env.STRIPE_PRICE_PRO_MONTHLY = '';
    process.env.STRIPE_PRICE_TEAM_MONTHLY = '';
    workspaceAccessService.getMembershipOrThrow.mockResolvedValue({
      role: WorkspaceRole.OWNER,
    });
    prismaService.workspace.findUnique.mockResolvedValue({
      id: 'workspace-1',
      name: 'TeamFlow Workspace',
      subscription: null,
    });

    await expect(
      service.createCheckoutSession(
        'workspace-1',
        { plan: SubscriptionPlan.PRO },
        currentUser,
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects portal session creation when no stripe customer exists', async () => {
    workspaceAccessService.getMembershipOrThrow.mockResolvedValue({
      role: WorkspaceRole.OWNER,
    });
    prismaService.subscription.findUnique.mockResolvedValue(null);

    await expect(
      service.createPortalSession('workspace-1', currentUser),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns an empty invoice list when no stripe customer exists', async () => {
    workspaceAccessService.assertWorkspaceExists.mockResolvedValue(undefined);
    workspaceAccessService.getMembershipOrThrow.mockResolvedValue({
      role: WorkspaceRole.OWNER,
    });
    prismaService.subscription.findUnique.mockResolvedValue(null);

    await expect(
      service.listInvoices('workspace-1', currentUser),
    ).resolves.toEqual([]);
  });

  it('logs checkout completion against the internal subscription id', async () => {
    const upsertedSubscription = {
      id: 'subscription-uuid-1',
      workspaceId: 'workspace-1',
      stripeCustomerId: 'cus_123',
      stripeSubId: 'sub_123',
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
    };

    prismaService.subscription.upsert.mockResolvedValue(upsertedSubscription);

    await (service as any).syncSubscriptionFromCheckoutSession({
      metadata: {
        workspaceId: 'workspace-1',
        plan: SubscriptionPlan.PRO,
      },
      customer: 'cus_123',
      subscription: 'sub_123',
    });

    expect(auditLogsService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'workspace-1',
        entityType: 'subscription',
        entityId: 'subscription-uuid-1',
        action: 'billing.checkout_completed',
        metadata: expect.objectContaining({
          subscriptionId: 'sub_123',
          customerId: 'cus_123',
          plan: SubscriptionPlan.PRO,
        }),
      }),
    );
  });
});
