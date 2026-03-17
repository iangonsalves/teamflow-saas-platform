import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskAssigneeDto } from './dto/update-task-assignee.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/projects/:projectId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a task inside a project' })
  createTask(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.createTask(
      workspaceId,
      projectId,
      createTaskDto,
      user,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List tasks for a project with pagination and filters' })
  listTasks(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Query() query: ListTasksQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.listTasks(workspaceId, projectId, query, user);
  }

  @Get(':taskId')
  @ApiOperation({ summary: 'Get a task by id inside a project' })
  getTaskById(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.getTaskById(workspaceId, projectId, taskId, user);
  }

  @Patch(':taskId')
  @ApiOperation({ summary: 'Update task details' })
  updateTask(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.updateTask(
      workspaceId,
      projectId,
      taskId,
      updateTaskDto,
      user,
    );
  }

  @Patch(':taskId/status')
  @ApiOperation({ summary: 'Update task status' })
  updateTaskStatus(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() updateTaskStatusDto: UpdateTaskStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.updateTaskStatus(
      workspaceId,
      projectId,
      taskId,
      updateTaskStatusDto,
      user,
    );
  }

  @Patch(':taskId/assignee')
  @ApiOperation({ summary: 'Assign or unassign a task' })
  updateTaskAssignee(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() updateTaskAssigneeDto: UpdateTaskAssigneeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tasksService.updateTaskAssignee(
      workspaceId,
      projectId,
      taskId,
      updateTaskAssigneeDto,
      user,
    );
  }
}
