import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  Prisma,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  WorkspaceRole,
} from '@prisma/client';
import Stripe from 'stripe';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

type BillingSubscriptionResponse = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubId: string | null;
};

type BillingInvoiceResponse = {
  id: string;
  amountPaid: number;
  currency: string;
  status: string | null;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
  createdAt: string;
};

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccessService: WorkspaceAccessService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async getWorkspaceSubscription(
    workspaceId: string,
    user: AuthenticatedUser,
  ): Promise<BillingSubscriptionResponse> {
    await this.workspaceAccessService.assertWorkspaceExists(workspaceId);
    await this.workspaceAccessService.getMembershipOrThrow(workspaceId, user.sub);

    const subscription = await this.prisma.subscription.findUnique({
      where: { workspaceId },
    });

    if (subscription) {
      const syncedSubscription = await this.reconcileSubscriptionWithStripe(
        subscription,
      );

      return {
        plan: syncedSubscription.plan,
        status: syncedSubscription.status,
        stripeCustomerId: syncedSubscription.stripeCustomerId,
        stripeSubId: syncedSubscription.stripeSubId,
      };
    }

    return {
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.INACTIVE,
      stripeCustomerId: null,
      stripeSubId: null,
    };
  }

  async createCheckoutSession(
    workspaceId: string,
    createCheckoutSessionDto: CreateCheckoutSessionDto,
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
        'Only workspace owners and admins can manage billing.',
      );
    }

    const priceId = this.getPriceIdForPlan(createCheckoutSessionDto.plan);
    const stripe = this.getStripeClient();
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        subscription: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found.');
    }

    let stripeCustomerId = workspace.subscription?.stripeCustomerId ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: workspace.name,
        email: user.email,
        metadata: {
          workspaceId,
        },
      });
      stripeCustomerId = customer.id;

      await this.prisma.subscription.upsert({
        where: { workspaceId },
        update: {
          stripeCustomerId,
        },
        create: {
          workspaceId,
          stripeCustomerId,
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.INACTIVE,
        },
      });
    }

    const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      success_url: `${baseUrl}/settings/billing?workspaceId=${workspaceId}&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/settings/billing?workspaceId=${workspaceId}&checkout=cancelled`,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        workspaceId,
        plan: createCheckoutSessionDto.plan,
      },
    });

    await this.auditLogsService.logEvent({
      workspaceId,
      actorUserId: user.sub,
      entityType: 'subscription',
      entityId: workspace.subscription?.id ?? workspaceId,
      action: 'billing.checkout_session_created',
      metadata: {
        checkoutSessionId: session.id,
        plan: createCheckoutSessionDto.plan,
      },
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  async createPortalSession(workspaceId: string, user: AuthenticatedUser) {
    const membership = await this.workspaceAccessService.getMembershipOrThrow(
      workspaceId,
      user.sub,
    );

    if (
      membership.role !== WorkspaceRole.OWNER &&
      membership.role !== WorkspaceRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only workspace owners and admins can manage billing.',
      );
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { workspaceId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new NotFoundException(
        'No Stripe customer exists for this workspace yet.',
      );
    }

    const stripe = this.getStripeClient();
    const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${baseUrl}/settings/billing?workspaceId=${workspaceId}`,
    });

    await this.auditLogsService.logEvent({
      workspaceId,
      actorUserId: user.sub,
      entityType: 'subscription',
      entityId: subscription.id,
      action: 'billing.portal_session_created',
      metadata: {
        stripeCustomerId: subscription.stripeCustomerId,
      },
    });

    return {
      portalUrl: session.url,
    };
  }

  async syncCheckoutSession(
    workspaceId: string,
    sessionId: string,
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
        'Only workspace owners and admins can manage billing.',
      );
    }

    const stripe = this.getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.workspaceId !== workspaceId) {
      throw new ForbiddenException(
        'Checkout session does not belong to this workspace.',
      );
    }

    await this.syncSubscriptionFromCheckoutSession(session);

    return { synced: true };
  }

  async listInvoices(
    workspaceId: string,
    user: AuthenticatedUser,
  ): Promise<BillingInvoiceResponse[]> {
    await this.workspaceAccessService.assertWorkspaceExists(workspaceId);
    await this.workspaceAccessService.getMembershipOrThrow(workspaceId, user.sub);

    const subscription = await this.prisma.subscription.findUnique({
      where: { workspaceId },
    });

    if (!subscription?.stripeCustomerId) {
      return [];
    }

    const stripe = this.getStripeClient();
    const invoices = await stripe.invoices.list({
      customer: subscription.stripeCustomerId,
      limit: 12,
    });

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      invoicePdf: invoice.invoice_pdf ?? null,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      createdAt: new Date(invoice.created * 1000).toISOString(),
    }));
  }

  async handleStripeWebhook(signature: string | undefined, rawBody: Buffer) {
    const stripe = this.getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret || webhookSecret.includes('placeholder')) {
      throw new ServiceUnavailableException(
        'Stripe webhook secret is not configured.',
      );
    }

    if (!signature) {
      throw new ServiceUnavailableException('Missing Stripe signature header.');
    }

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.syncSubscriptionFromCheckoutSession(session);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.syncSubscriptionFromStripeSubscription(subscription);
        break;
      }
      default:
        break;
    }

    return { received: true };
  }

  private async syncSubscriptionFromCheckoutSession(
    session: Stripe.Checkout.Session,
  ) {
    const workspaceId = session.metadata?.workspaceId;
    const plan = this.mapPlan(session.metadata?.plan);

    if (!workspaceId || !plan) {
      return;
    }

    const subscription = await this.prisma.subscription.upsert({
      where: { workspaceId },
      update: {
        stripeCustomerId:
          typeof session.customer === 'string' ? session.customer : null,
        stripeSubId:
          typeof session.subscription === 'string' ? session.subscription : null,
        plan,
        status: SubscriptionStatus.ACTIVE,
      },
      create: {
        workspaceId,
        stripeCustomerId:
          typeof session.customer === 'string' ? session.customer : null,
        stripeSubId:
          typeof session.subscription === 'string' ? session.subscription : null,
        plan,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    await this.auditLogsService.logEvent({
      workspaceId,
      entityType: 'subscription',
      entityId: subscription.id,
      action: 'billing.checkout_completed',
      metadata: {
        customerId:
          typeof session.customer === 'string' ? session.customer : null,
        subscriptionId:
          typeof session.subscription === 'string' ? session.subscription : null,
        plan,
      },
    });
  }

  private async syncSubscriptionFromStripeSubscription(
    stripeSubscription: Stripe.Subscription,
  ) {
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        OR: [
          { stripeSubId: stripeSubscription.id },
          {
            stripeCustomerId:
              typeof stripeSubscription.customer === 'string'
                ? stripeSubscription.customer
                : undefined,
          },
        ],
      },
    });

    if (!existingSubscription) {
      return;
    }

    const status = this.mapStripeStatus(stripeSubscription.status);
    const plan = this.mapPlanFromStripeSubscription(stripeSubscription);

    await this.prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        stripeSubId: stripeSubscription.id,
        plan,
        status,
      },
    });

    await this.auditLogsService.logEvent({
      workspaceId: existingSubscription.workspaceId,
      entityType: 'subscription',
      entityId: existingSubscription.id,
      action: 'billing.subscription_synced',
      metadata: {
        stripeSubscriptionId: stripeSubscription.id,
        plan,
        status,
      },
    });
  }

  private async reconcileSubscriptionWithStripe(
    subscription: Subscription,
  ): Promise<Subscription> {
    if (!subscription.stripeCustomerId) {
      return subscription;
    }

    try {
      const stripe = this.getStripeClient();
      const subscriptionList = await stripe.subscriptions.list({
        customer: subscription.stripeCustomerId,
        status: 'all',
        limit: 10,
      });
      const stripeSubscription = this.selectCurrentStripeSubscription(
        subscriptionList.data,
      );

      if (!stripeSubscription) {
        return subscription;
      }

      const nextPlan = this.mapPlanFromStripeSubscription(stripeSubscription);
      const nextStatus = this.mapStripeStatus(stripeSubscription.status);
      const nextStripeSubId = stripeSubscription.id;

      if (
        subscription.plan === nextPlan &&
        subscription.status === nextStatus &&
        subscription.stripeSubId === nextStripeSubId
      ) {
        return subscription;
      }

      return this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          plan: nextPlan,
          status: nextStatus,
          stripeSubId: nextStripeSubId,
        },
      });
    } catch {
      return subscription;
    }
  }

  private selectCurrentStripeSubscription(
    subscriptions: Stripe.Subscription[],
  ): Stripe.Subscription | null {
    if (subscriptions.length === 0) {
      return null;
    }

    const statusRank: Record<string, number> = {
      active: 4,
      trialing: 3,
      past_due: 2,
      incomplete: 1,
      unpaid: 1,
      paused: 1,
      canceled: 0,
      incomplete_expired: 0,
    };

    return [...subscriptions].sort((left, right) => {
      const statusDelta =
        (statusRank[right.status] ?? -1) - (statusRank[left.status] ?? -1);

      if (statusDelta !== 0) {
        return statusDelta;
      }

      return (right.created ?? 0) - (left.created ?? 0);
    })[0] ?? null;
  }

  private getStripeClient() {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey || secretKey.includes('placeholder')) {
      throw new ServiceUnavailableException(
        'Stripe secret key is not configured.',
      );
    }

    return new Stripe(secretKey, {
      apiVersion: '2026-02-25.clover',
    });
  }

  private getPriceIdForPlan(plan: SubscriptionPlan) {
    const priceMap: Record<SubscriptionPlan, string | undefined> = {
      [SubscriptionPlan.FREE]: undefined,
      [SubscriptionPlan.PRO]: process.env.STRIPE_PRICE_PRO_MONTHLY,
      [SubscriptionPlan.TEAM]: process.env.STRIPE_PRICE_TEAM_MONTHLY,
    };

    const priceId = priceMap[plan];

    if (!priceId) {
      throw new ServiceUnavailableException(
        `Stripe price ID is not configured for the ${plan} plan.`,
      );
    }

    return priceId;
  }

  private mapPlan(plan: string | undefined): SubscriptionPlan | null {
    if (plan === SubscriptionPlan.PRO || plan === SubscriptionPlan.TEAM) {
      return plan;
    }

    return null;
  }

  private mapPlanFromStripeSubscription(
    stripeSubscription: Stripe.Subscription,
  ): SubscriptionPlan {
    const activePriceId = stripeSubscription.items.data[0]?.price?.id;

    if (activePriceId === process.env.STRIPE_PRICE_PRO_MONTHLY) {
      return SubscriptionPlan.PRO;
    }

    if (activePriceId === process.env.STRIPE_PRICE_TEAM_MONTHLY) {
      return SubscriptionPlan.TEAM;
    }

    return SubscriptionPlan.FREE;
  }

  private mapStripeStatus(status: Stripe.Subscription.Status) {
    const statusMap: Record<string, SubscriptionStatus> = {
      trialing: SubscriptionStatus.TRIALING,
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      unpaid: SubscriptionStatus.PAST_DUE,
      incomplete: SubscriptionStatus.INACTIVE,
      incomplete_expired: SubscriptionStatus.CANCELED,
      paused: SubscriptionStatus.INACTIVE,
    };

    return statusMap[status] ?? SubscriptionStatus.INACTIVE;
  }
}
