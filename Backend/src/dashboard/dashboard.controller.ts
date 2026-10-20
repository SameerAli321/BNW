import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { DashboardService } from './dashboard.service';
import { TeamStatusService } from './team-status.service';
import { QueryTeamStatusDto } from './dto/team-status.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly service: DashboardService,
    private readonly teamStatus: TeamStatusService,
  ) {}

  // Everyone — the service decides which sections (personal / team / company) the caller gets.
  @Get()
  async summary(@CurrentUser() caller: JwtUserPayload) {
    return this.service.summary(caller);
  }

  // "Team status" table: CEO / HR / ADMIN see everyone, Team Leads their direct reports.
  @Roles(RoleName.CEO, RoleName.HR, RoleName.ADMIN, RoleName.MANAGER)
  @Get('team-status')
  async teamStatusList(@Query() query: QueryTeamStatusDto, @CurrentUser() caller: JwtUserPayload) {
    return this.teamStatus.list(query, caller);
  }

  // One person's full activity feed (opened from a "Team status" row) — same people as above.
  @Roles(RoleName.CEO, RoleName.HR, RoleName.ADMIN, RoleName.MANAGER)
  @Get('team-status/:userId/activity')
  async teamStatusActivity(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.teamStatus.activity(userId, caller);
  }
}
