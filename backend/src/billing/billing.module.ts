import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [WorkspacesModule, AuditLogsModule],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
