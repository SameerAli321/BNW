import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LetterTemplate } from '../entities/letter-template.entity';
import { Letter } from '../entities/letter.entity';
import { LetterEvent } from '../entities/letter-event.entity';
import { Signature } from '../entities/signature.entity';
import { DocumentType } from '../entities/document-type.entity';
import { UsersModule } from '../users/users.module';
import { EmployeesModule } from '../employees/employees.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { LetterTemplatesController } from './letter-templates.controller';
import { LettersController } from './letters.controller';
import { LettersService } from './letters.service';
import { LetterPdfRendererService } from './letter-pdf-renderer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LetterTemplate, Letter, LetterEvent, Signature, DocumentType]),
    UsersModule,
    EmployeesModule,
    AuditLogModule,
  ],
  controllers: [LetterTemplatesController, LettersController],
  providers: [LettersService, LetterPdfRendererService],
})
export class LettersModule {}
