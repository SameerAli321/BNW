import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { AppraisalsService } from './appraisals.service';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { CreateAppraisalRequestDto } from './dto/create-appraisal-request.dto';
import { ManagerDecisionDto } from './dto/manager-decision.dto';
import { CeoDecisionDto } from './dto/ceo-decision.dto';
import { QueryAppraisalRequestsDto } from './dto/query-appraisal-requests.dto';
import { QueryTeamAppraisalsDto } from './dto/query-team-appraisals.dto';

@Controller('appraisal-requests')
export class AppraisalsController {
  constructor(private readonly appraisalsService: AppraisalsService) {}

  // Any authenticated caller with a manager set may submit one for themself — no @Roles gate
  // (every role from EMPLOYEE up can be someone's report), per API_CONTRACT_SPRINT4.md.
  @Post()
  async submit(@Body() dto: CreateAppraisalRequestDto, @CurrentUser() caller: JwtUserPayload) {
    return this.appraisalsService.submit(dto, caller);
  }

  @Get('mine')
  async mine(@CurrentUser() caller: JwtUserPayload) {
    return this.appraisalsService.mine(caller);
  }

  @Roles(RoleName.MANAGER, RoleName.HR, RoleName.ADMIN)
  @Get('team')
  async team(@Query() query: QueryTeamAppraisalsDto, @CurrentUser() caller: JwtUserPayload) {
    const data = await this.appraisalsService.team(query, caller);
    return { data };
  }

  @Roles(RoleName.CEO)
  @Get('pending-ceo')
  async pendingCeo() {
    const data = await this.appraisalsService.pendingCeo();
    return { data };
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Get()
  async findAll(@Query() query: QueryAppraisalRequestsDto) {
    return this.appraisalsService.listAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    return this.appraisalsService.getOne(id, caller);
  }

  // Self (assigned managerId only) — enforced in the service, no @Roles gate.
  @Post(':id/manager-decision')
  async managerDecision(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ManagerDecisionDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.appraisalsService.managerDecision(id, dto, caller);
  }

  @Roles(RoleName.CEO)
  @Post(':id/ceo-decision')
  async ceoDecision(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CeoDecisionDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.appraisalsService.ceoDecision(id, dto, caller);
  }
}
