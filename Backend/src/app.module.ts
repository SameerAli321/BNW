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
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
