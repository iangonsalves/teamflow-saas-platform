import { IsEnum } from 'class-validator';
import { SubscriptionPlan } from '@prisma/client';

export class CreateCheckoutSessionDto {
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;
}
