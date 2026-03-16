import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [WorkspacesModule, AuditLogsModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
