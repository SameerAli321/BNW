import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppraisalRequest } from '../entities/appraisal-request.entity';
import { AppraisalEvent } from '../entities/appraisal-event.entity';
import { UsersModule } from '../users/users.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AppraisalsController } from './appraisals.controller';
import { AppraisalsService } from './appraisals.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppraisalRequest, AppraisalEvent]),
    UsersModule,
    AuditLogModule,
  ],
  controllers: [AppraisalsController],
  providers: [AppraisalsService],
})
export class AppraisalsModule {}
