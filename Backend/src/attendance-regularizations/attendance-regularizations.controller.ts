import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AttendanceRegularizationsService } from './attendance-regularizations.service';
import { AttendanceRegularizationPdfService } from './attendance-regularization-pdf.service';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { CreateAttendanceRegularizationDto } from './dto/create-attendance-regularization.dto';
import { HodRecommendationDto } from './dto/hod-recommendation.dto';
import { HrDecisionDto } from './dto/hr-decision.dto';
import { QueryAttendanceRegularizationsDto } from './dto/query-attendance-regularizations.dto';

@Controller('attendance-regularizations')
export class AttendanceRegularizationsController {
  constructor(
    private readonly service: AttendanceRegularizationsService,
    private readonly pdfService: AttendanceRegularizationPdfService,
  ) {}

  // Anyone can submit one for themselves — no @Roles gate; the employee is always the caller.
  @Post()
  async create(
    @Body() dto: CreateAttendanceRegularizationDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.create(dto, caller);
  }

  @Get('mine')
  async mine(
    @Query() query: QueryAttendanceRegularizationsDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.mine(query, caller);
  }

  // Forms where the caller is the head of department — any role can be someone's manager.
  @Get('team')
  async team(
    @Query() query: QueryAttendanceRegularizationsDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.team(query, caller);
  }

  @Roles(RoleName.HR, RoleName.ADMIN, RoleName.CEO)
  @Get()
  async findAll(@Query() query: QueryAttendanceRegularizationsDto) {
    return this.service.listAll(query);
  }

  // Employee, their HOD, or HR / ADMIN / CEO — enforced in the service.
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
    const bytes = await this.pdfService.render(row);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="attendance-regularization-${row.id}.pdf"`,
    });
    res.send(Buffer.from(bytes));
  }

  // The employee's HOD only — enforced in the service.
  @Post(':id/hod-recommendation')
  async hodRecommendation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: HodRecommendationDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.hodRecommendation(id, dto, caller);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post(':id/hr-decision')
  async hrDecision(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: HrDecisionDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.hrDecision(id, dto, caller);
  }
}
