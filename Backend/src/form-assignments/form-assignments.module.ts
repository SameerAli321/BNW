import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormAssignment } from '../entities/form-assignment.entity';
import { User } from '../entities/user.entity';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { FormAssignmentsController } from './form-assignments.controller';
import { FormAssignmentsService } from './form-assignments.service';

/** "HR sends a form": HR / Admin ask employees to fill in a form; shown on Requests & Forms. */
@Module({
  imports: [TypeOrmModule.forFeature([FormAssignment, User]), AuditLogModule],
  controllers: [FormAssignmentsController],
  providers: [FormAssignmentsService],
})
export class FormAssignmentsModule {}
