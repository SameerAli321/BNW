import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { LeaveService } from './leave.service';
import { LeavePdfService } from './leave-pdf.service';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { LeaveDecisionDto } from './dto/leave-decision.dto';
import { QueryLeaveRequestsDto } from './dto/query-leave-requests.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';

@Controller('leave-types')
export class LeaveTypesController {
  constructor(private readonly service: LeaveService) {}

  // Everyone needs the list to apply; `includeInactive` is for the HR/Admin policy editor.
  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    return this.service.listTypes(includeInactive === 'true');
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLeaveTypeDto) {
    return this.service.updateType(id, dto);
  }
}

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(
    private readonly service: LeaveService,
    private readonly pdfService: LeavePdfService,
  ) {}

  // Anyone can apply for themselves — no @Roles gate; the employee is always the caller.
  @Post()
  async create(@Body() dto: CreateLeaveRequestDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.create(dto, caller);
  }

  @Get('mine')
  async mine(@Query() query: QueryLeaveRequestsDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.mine(query, caller);
  }

  // Requests where the caller is the approving manager.
  @Get('team')
  async team(@Query() query: QueryLeaveRequestsDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.team(query, caller);
  }

  // Yearly balance — self, the user's manager, or HR / ADMIN / CEO (checked in the service).
  @Get('balance/:userId')
  async balance(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('year') year: string | undefined,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.balances(userId, Number(year) || new Date().getFullYear(), caller);
  }

  @Roles(RoleName.HR, RoleName.ADMIN, RoleName.CEO)
  @Get()
  async findAll(@Query() query: QueryLeaveRequestsDto) {
    return this.service.listAll(query);
  }

  // Employee, their manager, or HR / ADMIN / CEO — enforced in the service.
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    return this.service.getOne(id, caller);
  }

  @Get(':id/pdf')
  async downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() caller: JwtUserPayload,
    @Res() res: Response,
  ) {
    const row = await this.service.findEntityForViewer(id, caller);
    const balances = await this.service.balances(
      row.employeeId,
      Number(row.startDate.slice(0, 4)),
      caller,
    );
    const bytes = await this.pdfService.render(
      row,
      balances.find((b) => b.leaveTypeId === row.leaveTypeId) ?? null,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="leave-application-${row.id}.pdf"`,
    });
    res.send(Buffer.from(bytes));
  }

  // The employee's manager only — enforced in the service.
  @Post(':id/manager-decision')
  async managerDecision(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LeaveDecisionDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.managerDecision(id, dto, caller);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post(':id/hr-decision')
  async hrDecision(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LeaveDecisionDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.hrDecision(id, dto, caller);
  }

  // The employee only, while pending — enforced in the service.
  @Post(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    return this.service.cancel(id, caller);
  }
}
