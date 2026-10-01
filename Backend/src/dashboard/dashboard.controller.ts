import { Controller, Get } from '@nestjs/common';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  // Everyone — the service decides which sections (personal / team / company) the caller gets.
  @Get()
  async summary(@CurrentUser() caller: JwtUserPayload) {
    return this.service.summary(caller);
  }
}
