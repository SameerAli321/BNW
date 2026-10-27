import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import {
  GenerateFromPayrollDto,
  PayrollQueryDto,
  PayrollWorkingDaysDto,
  UpdatePayrollEntryDto,
} from './dto/salary-slip.dto';
import { PayrollService } from './payroll.service';

/** The monthly payroll sheet. HR / ADMIN edit everything; the accountant (PAYROLL) Tax and Paid. */
@Controller('payroll')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Roles(RoleName.HR, RoleName.ADMIN, RoleName.PAYROLL)
  @Get()
  async sheet(@Query() query: PayrollQueryDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.getSheet(query.month, caller);
  }

  // Employee name + net salary for the month, as an Excel file.
  @Roles(RoleName.HR, RoleName.ADMIN, RoleName.PAYROLL)
  @Get('export')
  async export(
    @Query() query: PayrollQueryDto,
    @CurrentUser() caller: JwtUserPayload,
    @Res() res: Response,
  ) {
    const { bytes, filename } = await this.service.exportSheet(query.month, caller);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(bytes.length),
    });
    res.send(bytes);
  }

  // Declared before ':employeeId' so 'working-days' isn't parsed as an id.
  @Roles(RoleName.HR, RoleName.ADMIN)
  @Put('working-days')
  async workingDays(@Body() dto: PayrollWorkingDaysDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.setWorkingDays(dto, caller);
  }

  @Roles(RoleName.HR, RoleName.ADMIN, RoleName.PAYROLL)
  @Put(':employeeId')
  async update(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Body() dto: UpdatePayrollEntryDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.updateEntry(employeeId, dto, caller);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post(':employeeId/generate')
  async generate(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Body() dto: GenerateFromPayrollDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.generate(employeeId, dto.month, dto.regenerate, caller);
  }
}
