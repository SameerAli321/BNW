import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { DocumentType } from '../entities/document-type.entity';
import { EmployeeDocument } from '../entities/employee-document.entity';
import { DocumentRequest } from '../entities/document-request.entity';
import { UsersModule } from '../users/users.module';
import { EmployeesController } from './employees.controller';
import { DocumentsController } from './documents.controller';
import { DocumentTypesController } from './document-types.controller';
import { EmployeesService } from './employees.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, DocumentType, EmployeeDocument, DocumentRequest]),
    UsersModule,
  ],
  controllers: [EmployeesController, DocumentsController, DocumentTypesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
