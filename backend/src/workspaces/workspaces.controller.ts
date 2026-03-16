import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AddWorkspaceMemberDto } from './dto/add-workspace-member.dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceMemberRoleDto } from './dto/update-workspace-member-role.dto';
import { WorkspacesService } from './workspaces.service';

@ApiTags('workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  createWorkspace(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workspacesService.createWorkspace(createWorkspaceDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List workspaces for the authenticated user' })
  listWorkspaces(@CurrentUser() user: AuthenticatedUser) {
    return this.workspacesService.listUserWorkspaces(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a workspace by id if the user belongs to it' })
  getWorkspaceById(
    @Param('id') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workspacesService.getWorkspaceById(workspaceId, user);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List members in a workspace' })
  listWorkspaceMembers(
    @Param('id') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workspacesService.listWorkspaceMembers(workspaceId, user);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add an existing user to a workspace' })
  addWorkspaceMember(
    @Param('id') workspaceId: string,
    @Body() addWorkspaceMemberDto: AddWorkspaceMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workspacesService.addWorkspaceMember(
      workspaceId,
      addWorkspaceMemberDto,
      user,
    );
  }

  @Patch(':id/members/:memberUserId')
  @ApiOperation({ summary: 'Update a workspace member role' })
  updateWorkspaceMemberRole(
    @Param('id') workspaceId: string,
    @Param('memberUserId') memberUserId: string,
    @Body() updateWorkspaceMemberRoleDto: UpdateWorkspaceMemberRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workspacesService.updateWorkspaceMemberRole(
      workspaceId,
      memberUserId,
      updateWorkspaceMemberRoleDto,
      user,
    );
  }

  @Delete(':id/members/:memberUserId')
  @ApiOperation({ summary: 'Remove a workspace member' })
  removeWorkspaceMember(
    @Param('id') workspaceId: string,
    @Param('memberUserId') memberUserId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workspacesService.removeWorkspaceMember(
      workspaceId,
      memberUserId,
      user,
    );
  }
}
