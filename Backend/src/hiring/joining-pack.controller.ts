import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { JoiningPackService } from './joining-pack.service';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { CreateJoiningPackItemDto } from './dto/create-joining-pack-item.dto';
import { UpdateJoiningPackItemDto } from './dto/update-joining-pack-item.dto';

@Controller('joining-pack-items')
export class JoiningPackController {
  constructor(private readonly joiningPackService: JoiningPackService) {}

  // Any authenticated user — every employee needs to see and acknowledge their own joining pack.
  @Get()
  async findAll(@CurrentUser() caller: JwtUserPayload) {
    const data = await this.joiningPackService.findAllForUser(caller.sub);
    return { data };
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post()
  async create(@Body() dto: CreateJoiningPackItemDto) {
    return this.joiningPackService.create(dto);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateJoiningPackItemDto) {
    return this.joiningPackService.update(id, dto);
  }

  // Any authenticated user — "I have read this."
  @Post(':id/acknowledge')
  async acknowledge(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    return this.joiningPackService.acknowledge(id, caller.sub);
  }
}
