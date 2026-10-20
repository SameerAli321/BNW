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
import {
  CreateFormAssignmentDto,
  QueryFormAssignmentsDto,
  QueryMyFormAssignmentsDto,
} from './dto/form-assignment.dto';
import { FormAssignmentsService } from './form-assignments.service';

@Controller('form-assignments')
export class FormAssignmentsController {
  constructor(private readonly service: FormAssignmentsService) {}

  // HR / Admin send a form to one or more employees — one row (and one notification) each.
  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post()
  async create(@Body() dto: CreateFormAssignmentDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.create(dto, caller);
  }

  // Anyone — the forms sent to the caller.
  @Get('mine')
  async mine(@Query() query: QueryMyFormAssignmentsDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.mine(query, caller);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Get()
  async list(@Query() query: QueryFormAssignmentsDto) {
    return this.service.list(query);
  }

  // The assignee, or HR / Admin (checked in the service).
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  async complete(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    return this.service.complete(id, caller);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    return this.service.cancel(id, caller);
  }
}
