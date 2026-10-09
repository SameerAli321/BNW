import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import {
  CreateSalarySlipDto,
  QuerySalarySlipsDto,
  SalarySlipDefaultsQueryDto,
} from './dto/salary-slip.dto';
import { SalarySlipsService } from './salary-slips.service';

@Controller('salary-slips')
export class SalarySlipsController {
  constructor(private readonly service: SalarySlipsService) {}

  // HR / ADMIN — the employee's details plus this month's / last month's slip for the form.
  @Roles(RoleName.HR, RoleName.ADMIN)
  @Get('defaults')
  async defaults(@Query() query: SalarySlipDefaultsQueryDto) {
    return this.service.getDefaults(query.employeeId, query.salaryMonth);
  }

  // Anyone — their own current slips.
  @Get('mine')
  async mine(@Query() query: QuerySalarySlipsDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.list(query, { kind: 'mine', userId: caller.sub }, caller);
  }

  // HR / ADMIN — salary slip history for everyone.
  @Roles(RoleName.HR, RoleName.ADMIN)
  @Get()
  async findAll(@Query() query: QuerySalarySlipsDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.list(query, { kind: 'all' }, caller);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post()
  async create(@Body() dto: CreateSalarySlipDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.create(dto, caller);
  }

  // Owner or HR / ADMIN.
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    return this.service.getOne(id, caller);
  }

  // Owner or HR / ADMIN. `?download=1` → attachment, otherwise inline (preview / print).
  @Get(':id/pdf')
  async pdf(
    @Param('id', ParseIntPipe) id: number,
    @Query('download') download: string | undefined,
    @CurrentUser() caller: JwtUserPayload,
    @Res() res: Response,
  ) {
    const { bytes, filename } = await this.service.getPdf(id, caller);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download === '1' || download === 'true' ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Content-Length': String(bytes.length),
    });
    res.send(bytes);
  }

  // HR / ADMIN — email the PDF to the employee's registered address (also "Resend").
  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  async send(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    return this.service.send(id, caller);
  }
}
