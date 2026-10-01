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
import { AnnouncementsService } from './announcements.service';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  // Everyone — the service filters to what's addressed to the caller.
  @Get()
  async findAll(
    @CurrentUser() caller: JwtUserPayload,
    @Query('includeExpired') includeExpired?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(caller, {
      includeExpired: includeExpired === 'true',
      limit: Number(limit) || undefined,
    });
  }

  @Roles(RoleName.CEO, RoleName.ADMIN, RoleName.HR)
  @Post()
  async create(@Body() dto: CreateAnnouncementDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.create(dto, caller);
  }

  // The poster or ADMIN — enforced in the service.
  @Roles(RoleName.CEO, RoleName.ADMIN, RoleName.HR)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.update(id, dto, caller);
  }

  @Roles(RoleName.CEO, RoleName.ADMIN, RoleName.HR)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    await this.service.remove(id, caller);
    return { deleted: true };
  }
}
