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
} from '@nestjs/common';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { CreateLoanDto, QueryLoansDto } from './dto/salary-slip.dto';
import { LoansService } from './loans.service';

/** Employee loans repaid in monthly instalments from salary. HR / ADMIN; the accountant can view. */
@Controller('loans')
export class LoansController {
  constructor(private readonly service: LoansService) {}

  @Roles(RoleName.HR, RoleName.ADMIN, RoleName.PAYROLL)
  @Get()
  async list(@Query() query: QueryLoansDto) {
    return this.service.list(query);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post()
  async create(@Body() dto: CreateLoanDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.create(dto, caller);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    return this.service.cancel(id, caller);
  }
}
