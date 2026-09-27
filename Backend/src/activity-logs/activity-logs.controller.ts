import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { UpdateActivityLogDto } from './dto/update-activity-log.dto';
import { QueryActivityLogsDto } from './dto/query-activity-logs.dto';

@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  // Every role logs their own work — no @Roles gate; the entry is always the caller's.
  @Post()
  async create(@Body() dto: CreateActivityLogDto, @CurrentUser() caller: JwtUserPayload) {
    return this.activityLogsService.create(dto, caller);
  }

  @Get('mine')
  async mine(@Query() query: QueryActivityLogsDto, @CurrentUser() caller: JwtUserPayload) {
    return this.activityLogsService.mine(query, caller);
  }

  @Roles(RoleName.MANAGER)
  @Get('team')
  async team(@Query() query: QueryActivityLogsDto, @CurrentUser() caller: JwtUserPayload) {
    return this.activityLogsService.team(query, caller);
  }

  @Roles(RoleName.CEO, RoleName.ADMIN)
  @Get()
  async findAll(@Query() query: QueryActivityLogsDto) {
    return this.activityLogsService.listAll(query);
  }

  // Owner only — enforced in the service.
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActivityLogDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.activityLogsService.update(id, dto, caller);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    await this.activityLogsService.remove(id, caller);
    return { deleted: true };
  }
}
