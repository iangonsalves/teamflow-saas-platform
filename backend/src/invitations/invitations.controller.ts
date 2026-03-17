import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationsService } from './invitations.service';

@ApiTags('invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get('workspaces/:workspaceId/invitations')
  @ApiOperation({ summary: 'List workspace invitations' })
  listWorkspaceInvitations(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitationsService.listWorkspaceInvitations(workspaceId, user);
  }

  @Post('workspaces/:workspaceId/invitations')
  @ApiOperation({ summary: 'Create a workspace invitation' })
  createInvitation(
    @Param('workspaceId') workspaceId: string,
    @Body() createInvitationDto: CreateInvitationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitationsService.createInvitation(
      workspaceId,
      createInvitationDto,
      user,
    );
  }

  @Post('invitations/accept')
  @ApiOperation({ summary: 'Accept a workspace invitation by token' })
  acceptInvitation(
    @Body() acceptInvitationDto: AcceptInvitationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitationsService.acceptInvitation(acceptInvitationDto, user);
  }
}
