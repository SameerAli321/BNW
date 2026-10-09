import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalarySlip } from '../entities/salary-slip.entity';
import { User } from '../entities/user.entity';
import { EmployeeProfile } from '../entities/employee-profile.entity';
import { Notification } from '../entities/notification.entity';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { SalarySlipsController } from './salary-slips.controller';
import { SalarySlipsService } from './salary-slips.service';
import { SalarySlipPdfService } from './salary-slip-pdf.service';

/** Salary slips: HR / Admin generate a monthly slip PDF and email it; employees see their own. */
@Module({
  imports: [
    TypeOrmModule.forFeature([SalarySlip, User, EmployeeProfile, Notification]),
    AuditLogModule,
  ],
  controllers: [SalarySlipsController],
  providers: [SalarySlipsService, SalarySlipPdfService],
})
export class SalarySlipsModule {}
