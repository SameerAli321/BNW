import { Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Self-scoped, server-side — userId = caller.sub, never a query param. Any authenticated user.
  @Get()
  async findAll(@Query() query: QueryNotificationsDto, @CurrentUser() caller: JwtUserPayload) {
    return this.notificationsService.findAllForUser(caller.sub, query);
  }

  // Only for the caller's own notification (403 otherwise) — enforced in the service.
  @Post(':id/read')
  async markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    return this.notificationsService.markRead(id, caller.sub);
  }
}
