import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { BillingService } from './billing.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

type StripeWebhookRequest = Request & { rawBody?: Buffer };

@ApiTags('billing')
@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('workspaces/:workspaceId/billing/subscription')
  @ApiOperation({ summary: 'Get current workspace subscription state' })
  getWorkspaceSubscription(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billingService.getWorkspaceSubscription(workspaceId, user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('workspaces/:workspaceId/billing/checkout-session')
  @ApiOperation({ summary: 'Create a Stripe checkout session for a workspace plan' })
  createCheckoutSession(
    @Param('workspaceId') workspaceId: string,
    @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billingService.createCheckoutSession(
      workspaceId,
      createCheckoutSessionDto,
      user,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('workspaces/:workspaceId/billing/portal-session')
  @ApiOperation({ summary: 'Create a Stripe billing portal session for a workspace' })
  createPortalSession(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billingService.createPortalSession(workspaceId, user);
  }

  @Post('billing/webhooks/stripe')
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  handleStripeWebhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() request: StripeWebhookRequest,
  ) {
    return this.billingService.handleStripeWebhook(
      signature,
      request.rawBody ?? Buffer.from(JSON.stringify(request.body ?? {})),
    );
  }
}
