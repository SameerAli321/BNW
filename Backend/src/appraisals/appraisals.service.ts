import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppraisalRequest } from '../entities/appraisal-request.entity';
import { AppraisalEvent } from '../entities/appraisal-event.entity';
import { AppraisalStatus } from '../common/enums/appraisal-status.enum';
import { AppraisalManagerDecision } from '../common/enums/appraisal-manager-decision.enum';
import { AppraisalCeoDecision } from '../common/enums/appraisal-ceo-decision.enum';
import { AppraisalEventAction } from '../common/enums/appraisal-event-action.enum';
import { RoleName } from '../common/enums/role.enum';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import {
  AppraisalRequestDto,
  toAppraisalEventDto,
  toAppraisalRequestDto,
} from '../common/mappers/appraisal.mapper';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateAppraisalRequestDto } from './dto/create-appraisal-request.dto';
import { ManagerDecisionDto } from './dto/manager-decision.dto';
import { CeoDecisionDto } from './dto/ceo-decision.dto';
import { QueryAppraisalRequestsDto } from './dto/query-appraisal-requests.dto';
import { QueryTeamAppraisalsDto } from './dto/query-team-appraisals.dto';

const ELIGIBILITY_MONTHS = 3;

function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setMonth(result.getMonth() + months);
  return result;
}

@Injectable()
export class AppraisalsService {
  constructor(
    @InjectRepository(AppraisalRequest)
    private readonly requestsRepo: Repository<AppraisalRequest>,
    @InjectRepository(AppraisalEvent)
    private readonly eventsRepo: Repository<AppraisalEvent>,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ---------------------------------------------------------------------------------------------
  // Ownership check — new case, modeled on LettersService.assertCanView /
  // UsersService.assertCanView but for this table's specific role set (per
  // docs/API_CONTRACT_SPRINT4.md: "HR, ADMIN, CEO, the request's employee, the request's
  // managerId").
  // ---------------------------------------------------------------------------------------------

  assertCanView(caller: JwtUserPayload, request: AppraisalRequest): void {
    if (
      caller.role === RoleName.HR ||
      caller.role === RoleName.ADMIN ||
      caller.role === RoleName.CEO
    ) {
      return;
    }
    if (caller.sub === request.employeeId) {
      return;
    }
    if (request.managerId !== null && caller.sub === request.managerId) {
      return;
    }
    throw new ForbiddenException('You do not have access to this appraisal request');
  }

  private async logEvent(
    appraisalRequestId: number,
    actorId: number,
    action: AppraisalEventAction,
    message: string | null = null,
  ): Promise<void> {
    await this.eventsRepo.save(
      this.eventsRepo.create({ appraisalRequestId, actorId, action, message }),
    );

    // Mirrors the gap-fix's audit-log pattern (LettersService.logEvent) — fire-and-forget, never
    // blocks or fails the request it's describing.
    this.auditLogService.log({
      actorId,
      action: 'APPRAISAL_STATUS_CHANGE',
      entity: 'AppraisalRequest',
      entityId: appraisalRequestId,
      after: { event: action, message },
    });
  }

  private async loadWithRelations(id: number): Promise<AppraisalRequest> {
    const request = await this.requestsRepo.findOne({
      where: { id },
      relations: ['employee', 'manager'],
    });
    if (!request) {
      throw new NotFoundException('Appraisal request not found');
    }
    return request;
  }

  /**
   * Computes canRequestNext/nextEligibleDate the same way for GET /appraisal-requests/mine's
   * `meta` and the 409 check on POST /appraisal-requests, from the most recent submittedAt for
   * that employee (per docs/API_CONTRACT_SPRINT4.md's eligibility check).
   */
  private async computeEligibility(
    employeeId: number,
  ): Promise<{ canRequestNext: boolean; nextEligibleDate: string | null }> {
    const last = await this.requestsRepo.findOne({
      where: { employeeId },
      order: { submittedAt: 'DESC' },
    });
    if (!last) {
      return { canRequestNext: true, nextEligibleDate: null };
    }
    const nextEligibleDate = addMonths(last.submittedAt, ELIGIBILITY_MONTHS);
    return {
      canRequestNext: Date.now() >= nextEligibleDate.getTime(),
      nextEligibleDate: nextEligibleDate.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------------------------

  async submit(
    dto: CreateAppraisalRequestDto,
    caller: JwtUserPayload,
  ): Promise<AppraisalRequestDto> {
    const employee = await this.usersService.findOneEntity(caller.sub);
    if (!employee.managerId) {
      throw new BadRequestException(
        "You have no manager set — an appraisal request can't be submitted without one",
      );
    }

    const eligibility = await this.computeEligibility(caller.sub);
    if (!eligibility.canRequestNext) {
      throw new ConflictException(
        `You already submitted an appraisal request in the last ${ELIGIBILITY_MONTHS} months. ` +
          `Next eligible date: ${eligibility.nextEligibleDate}`,
      );
    }

    const request = this.requestsRepo.create({
      employeeId: caller.sub,
      selfEvaluation: dto.selfEvaluation,
      status: AppraisalStatus.PENDING_MANAGER,
      managerId: employee.managerId,
    });
    const saved = await this.requestsRepo.save(request);
    await this.logEvent(saved.id, caller.sub, AppraisalEventAction.SUBMITTED);

    return toAppraisalRequestDto(await this.loadWithRelations(saved.id));
  }

  // ---------------------------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------------------------

  async mine(caller: JwtUserPayload): Promise<{
    data: AppraisalRequestDto[];
    meta: { canRequestNext: boolean; nextEligibleDate: string | null };
  }> {
    const rows = await this.requestsRepo.find({
      where: { employeeId: caller.sub },
      relations: ['employee', 'manager'],
      order: { submittedAt: 'DESC' },
    });
    const meta = await this.computeEligibility(caller.sub);
    return { data: rows.map((row) => toAppraisalRequestDto(row)), meta };
  }

  async team(
    query: QueryTeamAppraisalsDto,
    caller: JwtUserPayload,
  ): Promise<AppraisalRequestDto[]> {
    const rows = await this.requestsRepo.find({
      where: { managerId: caller.sub, status: query.status ?? AppraisalStatus.PENDING_MANAGER },
      relations: ['employee', 'manager'],
      order: { submittedAt: 'DESC' },
    });
    return rows.map((row) => toAppraisalRequestDto(row));
  }

  async pendingCeo(): Promise<AppraisalRequestDto[]> {
    const rows = await this.requestsRepo.find({
      where: { status: AppraisalStatus.PENDING_CEO },
      relations: ['employee', 'manager'],
      order: { submittedAt: 'ASC' },
    });
    return rows.map((row) => toAppraisalRequestDto(row));
  }

  async listAll(query: QueryAppraisalRequestsDto): Promise<{
    data: AppraisalRequestDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;

    const qb = this.requestsRepo
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.employee', 'employee')
      .leftJoinAndSelect('request.manager', 'manager');

    if (query.status) {
      qb.andWhere('request.status = :status', { status: query.status });
    }
    if (query.employeeId) {
      qb.andWhere('request.employeeId = :employeeId', { employeeId: query.employeeId });
    }

    qb.orderBy('request.submittedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map((row) => toAppraisalRequestDto(row)), meta: { total, page, limit } };
  }

  async getOne(id: number, caller: JwtUserPayload): Promise<AppraisalRequestDto> {
    const request = await this.loadWithRelations(id);
    this.assertCanView(caller, request);

    const events = await this.eventsRepo.find({
      where: { appraisalRequestId: id },
      relations: ['actor'],
      order: { createdAt: 'ASC' },
    });

    return toAppraisalRequestDto(request, { events: events.map(toAppraisalEventDto) });
  }

  // ---------------------------------------------------------------------------------------------
  // Decisions — status machine
  // ---------------------------------------------------------------------------------------------

  async managerDecision(
    id: number,
    dto: ManagerDecisionDto,
    caller: JwtUserPayload,
  ): Promise<AppraisalRequestDto> {
    const request = await this.requestsRepo.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException('Appraisal request not found');
    }
    if (request.managerId !== caller.sub) {
      throw new ForbiddenException(
        "Only this request's assigned manager may record a manager decision",
      );
    }
    if (request.status !== AppraisalStatus.PENDING_MANAGER) {
      throw new ConflictException(
        `Cannot record a manager decision on a request in status ${request.status} — must be PENDING_MANAGER`,
      );
    }

    request.managerRemarks = dto.remarks;
    request.managerMessage = dto.message;
    request.managerDecision = dto.decision;
    request.managerDecidedAt = new Date();

    if (dto.decision === AppraisalManagerDecision.ACCEPTED) {
      request.status = AppraisalStatus.PENDING_CEO;
      await this.requestsRepo.save(request);
      await this.logEvent(id, caller.sub, AppraisalEventAction.MANAGER_ACCEPTED, dto.message);
    } else {
      request.status = AppraisalStatus.MANAGER_REJECTED;
      await this.requestsRepo.save(request);
      await this.logEvent(id, caller.sub, AppraisalEventAction.MANAGER_REJECTED, dto.message);
    }

    return toAppraisalRequestDto(await this.loadWithRelations(id));
  }

  async ceoDecision(
    id: number,
    dto: CeoDecisionDto,
    caller: JwtUserPayload,
  ): Promise<AppraisalRequestDto> {
    const request = await this.requestsRepo.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException('Appraisal request not found');
    }
    if (request.status !== AppraisalStatus.PENDING_CEO) {
      throw new ConflictException(
        `Cannot record a CEO decision on a request in status ${request.status} — must be PENDING_CEO`,
      );
    }

    request.ceoRemarks = dto.remarks;
    request.ceoMessage = dto.message;
    request.ceoDecision = dto.decision;
    request.ceoDecidedAt = new Date();

    if (dto.decision === AppraisalCeoDecision.ACCEPTED) {
      request.status = AppraisalStatus.CEO_ACCEPTED;
      await this.requestsRepo.save(request);
      await this.logEvent(id, caller.sub, AppraisalEventAction.CEO_ACCEPTED, dto.message);
    } else if (dto.decision === AppraisalCeoDecision.REJECTED) {
      request.status = AppraisalStatus.CEO_REJECTED;
      await this.requestsRepo.save(request);
      await this.logEvent(id, caller.sub, AppraisalEventAction.CEO_REJECTED, dto.message);
    } else {
      // SEND_BACK: puts it back in the manager's queue. The OLD manager remarks/message/decision
      // stay in appraisal_events (already written on the prior MANAGER_ACCEPTED event); only the
      // LIVE manager_* columns on this row are cleared so the manager can act again on their next
      // pass — per docs/API_CONTRACT_SPRINT4.md's status-machine note.
      request.status = AppraisalStatus.PENDING_MANAGER;
      request.managerRemarks = null;
      request.managerMessage = null;
      request.managerDecision = null;
      request.managerDecidedAt = null;
      await this.requestsRepo.save(request);
      await this.logEvent(id, caller.sub, AppraisalEventAction.CEO_SENT_BACK, dto.message);
    }

    return toAppraisalRequestDto(await this.loadWithRelations(id));
  }
}
