import { IsOptional, IsUUID } from 'class-validator';

export class UpdateTaskAssigneeDto {
  @IsOptional()
  @IsUUID()
  assignedTo?: string | null;
}
