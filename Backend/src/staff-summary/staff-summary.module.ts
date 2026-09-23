import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { EmployeeDocument } from '../entities/employee-document.entity';
import { StaffSummaryController } from './staff-summary.controller';
import { StaffSummaryService } from './staff-summary.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, EmployeeDocument])],
  controllers: [StaffSummaryController],
  providers: [StaffSummaryService],
})
export class StaffSummaryModule {}
