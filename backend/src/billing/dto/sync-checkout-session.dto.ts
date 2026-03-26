import { IsString } from 'class-validator';

export class SyncCheckoutSessionDto {
  @IsString()
  sessionId: string;
}
