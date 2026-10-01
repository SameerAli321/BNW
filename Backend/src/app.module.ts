import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { Role } from './entities/role.entity';
import { Department } from './entities/department.entity';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { DocumentType } from './entities/document-type.entity';
import { EmployeeDocument } from './entities/employee-document.entity';
import { DocumentRequest } from './entities/document-request.entity';
import { LetterTemplate } from './entities/letter-template.entity';
import { Letter } from './entities/letter.entity';
import { LetterEvent } from './entities/letter-event.entity';
import { Signature } from './entities/signature.entity';
import { EmployeeProfile } from './entities/employee-profile.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Notification } from './entities/notification.entity';
import { AppraisalRequest } from './entities/appraisal-request.entity';
import { AppraisalEvent } from './entities/appraisal-event.entity';
import { Candidate } from './entities/candidate.entity';
import { JoiningPackItem } from './entities/joining-pack-item.entity';
import { JoiningPackAck } from './entities/joining-pack-ack.entity';
import { DailyActivityLog } from './entities/daily-activity-log.entity';
import { Complaint } from './entities/complaint.entity';
import { AttendanceRegularization } from './entities/attendance-regularization.entity';
import { OnboardingForm } from './entities/onboarding-form.entity';
import { LeaveType } from './entities/leave-type.entity';
import { LeaveRequest } from './entities/leave-request.entity';
import { Announcement } from './entities/announcement.entity';
import { Interview } from './entities/interview.entity';
import { WorkOrder } from './entities/work-order.entity';
import { AppSetting } from './entities/app-setting.entity';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { DepartmentsModule } from './departments/departments.module';
import { HealthModule } from './health/health.module';
import { EmployeesModule } from './employees/employees.module';
import { StaffSummaryModule } from './staff-summary/staff-summary.module';
import { LettersModule } from './letters/letters.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AppraisalsModule } from './appraisals/appraisals.module';
import { HiringModule } from './hiring/hiring.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { AttendanceRegularizationsModule } from './attendance-regularizations/attendance-regularizations.module';
import { OnboardingFormsModule } from './onboarding-forms/onboarding-forms.module';
import { LeaveModule } from './leave/leave.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { MailModule } from './mail/mail.module';
import { InterviewsModule } from './interviews/interviews.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: parseInt(config.get<string>('DB_PORT') || '5432', 10),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        namingStrategy: new SnakeNamingStrategy(),
        entities: [
          Role,
          Department,
          User,
          RefreshToken,
          DocumentType,
          EmployeeDocument,
          DocumentRequest,
          LetterTemplate,
          Letter,
          LetterEvent,
          Signature,
          EmployeeProfile,
          AuditLog,
          Notification,
          AppraisalRequest,
          AppraisalEvent,
          Candidate,
          JoiningPackItem,
          JoiningPackAck,
          DailyActivityLog,
          Complaint,
          AttendanceRegularization,
          OnboardingForm,
          LeaveType,
          LeaveRequest,
          Announcement,
          Interview,
          WorkOrder,
          AppSetting,
        ],
        synchronize: false, // migrations only — never sync() against a real schema
        autoLoadEntities: true,
      }),
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    DepartmentsModule,
    HealthModule,
    EmployeesModule,
    StaffSummaryModule,
    LettersModule,
    AuditLogModule,
    NotificationsModule,
    AppraisalsModule,
    HiringModule,
    ActivityLogsModule,
    ComplaintsModule,
    AttendanceRegularizationsModule,
    OnboardingFormsModule,
    LeaveModule,
    AnnouncementsModule,
    MailModule,
    InterviewsModule,
    WorkOrdersModule,
    DashboardModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
