import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Candidate } from '../entities/candidate.entity';
import { JoiningPackItem } from '../entities/joining-pack-item.entity';
import { JoiningPackAck } from '../entities/joining-pack-ack.entity';
import { UsersModule } from '../users/users.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { EmployeesModule } from '../employees/employees.module';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { JoiningPackController } from './joining-pack.controller';
import { JoiningPackService } from './joining-pack.service';

/**
 * Sprint 5 — Hiring (docs/API_CONTRACT_SPRINT5.md): candidates, bulk CV upload, convert-to-
 * employee, joining pack. Reuses UsersModule (UsersService.create for candidate conversion),
 * AuditLogModule (candidate CV download audit trail), and EmployeesModule
 * (EmployeesService.attachExistingFile to copy the CV into the new employee's E-record on
 * conversion — H1 "CVs are retained in employee E-record"), same pattern as LettersModule/
 * AppraisalsModule importing those.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Candidate, JoiningPackItem, JoiningPackAck]),
    UsersModule,
    AuditLogModule,
    EmployeesModule,
  ],
  controllers: [CandidatesController, JoiningPackController],
  providers: [CandidatesService, JoiningPackService],
})
export class HiringModule {}
