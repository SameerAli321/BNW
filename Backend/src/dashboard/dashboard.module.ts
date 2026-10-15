import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { TeamStatusService } from './team-status.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, TeamStatusService],
})
export class DashboardModule {}
