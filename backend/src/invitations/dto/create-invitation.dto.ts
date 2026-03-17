import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { WorkspaceRole } from '@prisma/client';

export class CreateInvitationDto {
  @IsEmail()
  email: string;

  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;

  @IsOptional()
  @IsString()
  expiresInDays?: string;
}
