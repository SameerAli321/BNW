import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSetting } from '../entities/app-setting.entity';
import { User } from '../entities/user.entity';
import { PolicyAcknowledgement } from '../entities/policy-acknowledgement.entity';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AboutController } from './about.controller';
import { AboutService } from './about.service';
import { PolicyService } from './policy.service';

/**
 * About us page: the Employee Policy Handbook with each employee's signed acknowledgement, plus the
 * company details and the CEO's message and photo (stored in app_settings).
 */
@Module({
  imports: [TypeOrmModule.forFeature([AppSetting, User, PolicyAcknowledgement]), AuditLogModule],
  controllers: [AboutController],
  providers: [AboutService, PolicyService],
})
export class AboutModule {}
