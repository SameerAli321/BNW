import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRegularization } from '../entities/attendance-regularization.entity';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { AttendanceRegularizationsController } from './attendance-regularizations.controller';
import { AttendanceRegularizationsService } from './attendance-regularizations.service';
import { AttendanceRegularizationPdfService } from './attendance-regularization-pdf.service';

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceRegularization, Notification, User])],
  controllers: [AttendanceRegularizationsController],
  providers: [AttendanceRegularizationsService, AttendanceRegularizationPdfService],
})
export class AttendanceRegularizationsModule {}
