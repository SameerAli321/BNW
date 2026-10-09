import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingForm } from '../entities/onboarding-form.entity';
import { EmployeeProfile } from '../entities/employee-profile.entity';
import { DocumentType } from '../entities/document-type.entity';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { EmployeesModule } from '../employees/employees.module';
import { OnboardingFormsController } from './onboarding-forms.controller';
import { OnboardingFormsService } from './onboarding-forms.service';
import { OnboardingFormPdfService } from './onboarding-form-pdf.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OnboardingForm, EmployeeProfile, DocumentType, Notification, User]),
    EmployeesModule,
  ],
  controllers: [OnboardingFormsController],
  providers: [OnboardingFormsService, OnboardingFormPdfService],
})
export class OnboardingFormsModule {}
