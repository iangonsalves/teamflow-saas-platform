import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
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
}
