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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateEmployeeProfileDto } from './dto/update-employee-profile.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Get()
  async findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post()
  async create(@Body() dto: CreateUserDto) {
    const { user } = await this.usersService.create(dto);
    return user;
  }

  // Allowed for HR/ADMIN, or the user themself ("self"), or their direct manager ("manager-of").
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    await this.usersService.assertCanView(caller, id);
    return this.usersService.findOne(id);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.usersService.update(id, dto, caller.sub);
  }

  @Roles(RoleName.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.softDelete(id);
    return { deleted: true };
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.usersService.resetPassword(id, caller.sub);
  }

  // HR/ADMIN, or self (only meaningful if the caller is that user's manager).
  @Get(':id/reports')
  async reports(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    this.usersService.assertCanViewReports(caller, id);
    return this.usersService.findReports(id);
  }

  // HR, ADMIN, self, manager-of — same ownership pattern as assertCanView. Gap-fix Gap 1.
  @Get(':id/profile')
  async getProfile(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    await this.usersService.assertCanView(caller, id);
    return this.usersService.getProfile(id);
  }

  // HR, ADMIN, or self only (no manager-of) — an employee can fill in their own profile, HR/Admin
  // can edit anyone's. Upserts on first write. Gap-fix Gap 1.
  @Patch(':id/profile')
  async updateProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeProfileDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    this.usersService.assertCanEditProfile(caller, id);
    return this.usersService.upsertProfile(id, dto);
  }
}
