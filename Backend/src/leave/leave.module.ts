import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveRequest } from '../entities/leave-request.entity';
import { LeaveType } from '../entities/leave-type.entity';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { LeaveRequestsController, LeaveTypesController } from './leave.controller';
import { LeaveService } from './leave.service';
import { LeavePdfService } from './leave-pdf.service';

@Module({
  imports: [TypeOrmModule.forFeature([LeaveRequest, LeaveType, Notification, User])],
  controllers: [LeaveTypesController, LeaveRequestsController],
  providers: [LeaveService, LeavePdfService],
})
export class LeaveModule {}
