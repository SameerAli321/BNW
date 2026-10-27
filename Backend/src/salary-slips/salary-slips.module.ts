import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalarySlip } from '../entities/salary-slip.entity';
import { User } from '../entities/user.entity';
import { EmployeeProfile } from '../entities/employee-profile.entity';
import { Notification } from '../entities/notification.entity';
import { PayrollEntry } from '../entities/payroll-entry.entity';
import { EmployeeLoan } from '../entities/employee-loan.entity';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { SalarySlipsController } from './salary-slips.controller';
import { SalarySlipsService } from './salary-slips.service';
import { SalarySlipPdfService } from './salary-slip-pdf.service';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollEntriesService } from './payroll-entries.service';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

/**
 * Salary slips: HR / Admin generate a monthly slip PDF and email it; employees see their own.
 * Also the monthly payroll sheet the slips are calculated from, and employee loans repaid from it.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalarySlip,
      User,
      EmployeeProfile,
      Notification,
      PayrollEntry,
      EmployeeLoan,
    ]),
    AuditLogModule,
  ],
  controllers: [SalarySlipsController, PayrollController, LoansController],
  providers: [
    SalarySlipsService,
    SalarySlipPdfService,
    PayrollService,
    PayrollEntriesService,
    LoansService,
  ],
  // Work orders add approved reimbursements to the payroll sheet.
  exports: [PayrollEntriesService],
})
export class SalarySlipsModule {}
