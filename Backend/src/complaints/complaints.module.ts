import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Complaint } from '../entities/complaint.entity';
import { EmployeeProfile } from '../entities/employee-profile.entity';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';
import { ComplaintPdfService } from './complaint-pdf.service';

@Module({
  imports: [TypeOrmModule.forFeature([Complaint, EmployeeProfile, Notification, User])],
  controllers: [ComplaintsController],
  providers: [ComplaintsService, ComplaintPdfService],
})
export class ComplaintsModule {}
