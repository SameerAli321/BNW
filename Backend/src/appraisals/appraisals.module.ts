import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppraisalRequest } from '../entities/appraisal-request.entity';
import { AppraisalEvent } from '../entities/appraisal-event.entity';
import { User } from '../entities/user.entity';
import { Notification } from '../entities/notification.entity';
import { UsersModule } from '../users/users.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AppraisalsController } from './appraisals.controller';
import { AppraisalsService } from './appraisals.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppraisalRequest, AppraisalEvent, User, Notification]),
    UsersModule,
    AuditLogModule,
  ],
  controllers: [AppraisalsController],
  providers: [AppraisalsService],
})
export class AppraisalsModule {}
