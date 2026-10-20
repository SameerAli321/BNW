import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LeaveRequest } from '../entities/leave-request.entity';
import { LeaveType } from '../entities/leave-type.entity';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { LeaveRequestStatus } from '../common/enums/leave-request-status.enum';
import { RoleName } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import {
  LeaveBalanceDto,
  LeaveRequestDto,
  LeaveTypeDto,
  toLeaveRequestDto,
  toLeaveTypeDto,
} from '../common/mappers/leave.mapper';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { LeaveDecisionDto } from './dto/leave-decision.dto';
import {
  LeaveCancellationDecisionDto,
  RequestLeaveCancellationDto,
} from './dto/leave-cancellation.dto';
import { EmailDetailRow } from '../mail/email-layout';
import { QueryLeaveRequestsDto } from './dto/query-leave-requests.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { RequestWatchersService } from '../notifications/request-watchers.service';
import { NotifyService } from '../notifications/notify.service';

const VIEW_ALL_ROLES: string[] = [RoleName.HR, RoleName.ADMIN, RoleName.CEO];
const RELATIONS = [
  'employee',
  'employee.department',
  'leaveType',
  'manager',
  'hrUser',
  'cancellationDecidedBy',
];
const PENDING = [LeaveRequestStatus.PENDING_MANAGER, LeaveRequestStatus.PENDING_HR];
// Approved leave stays approved (dates held, days used) while its cancellation is being decided.
const APPROVED_LIKE = [LeaveRequestStatus.APPROVED, LeaveRequestStatus.CANCELLATION_REQUESTED];
// Requests that hold the dates / count against the balance.
const ACTIVE = [...PENDING, ...APPROVED_LIKE];

const fullName = (user: { firstName: string; lastName: string } | null | undefined) =>
  user ? `${user.firstName} ${user.lastName}` : '';

const formatDay = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const leaveDates = (row: Pick<LeaveRequest, 'startDate' | 'endDate'>) =>
  row.startDate === row.endDate
    ? formatDay(row.startDate)
    : `${formatDay(row.startDate)} to ${formatDay(row.endDate)}`;

type ListScope = { employeeId: number } | { managerId: number } | 'all';

const DAY_MS = 24 * 60 * 60 * 1000;

const parseDay = (date: string) => new Date(`${date}T00:00:00Z`);
const isWeekend = (day: Date) => day.getUTCDay() === 0 || day.getUTCDay() === 6;

/** 'YYYY-MM-DD' shifted by a number of days. */
export function addDays(date: string, days: number): string {
  return new Date(parseDay(date).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday. */
export const weekdayOf = (date: string) => parseDay(date).getUTCDay();

/**
 * Days of leave a request from `startDate` to `endDate` (inclusive) costs, with the "sandwich"
 * rule: a weekend between two leave days of the same request counts as leave, so Fri → Mon is 4
 * days and Thu → Tue is 6. Weekend days at either edge are free (Sat → Mon is 1), and a range of
 * only weekend days is 0. In other words: every day from the first working day to the last.
 */
export function countLeaveDays(startDate: string, endDate: string): number {
  const first = parseDay(startDate);
  const last = parseDay(endDate);
  while (first <= last && isWeekend(first)) first.setUTCDate(first.getUTCDate() + 1);
  while (last >= first && isWeekend(last)) last.setUTCDate(last.getUTCDate() - 1);
  if (first > last) return 0;
  return Math.round((last.getTime() - first.getTime()) / DAY_MS) + 1;
}

/** Today as YYYY-MM-DD in the server's local time. */
function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(LeaveRequest) private readonly requestsRepo: Repository<LeaveRequest>,
    @InjectRepository(LeaveType) private readonly typesRepo: Repository<LeaveType>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
    private readonly requestWatchers: RequestWatchersService,
    private readonly notifier: NotifyService,
  ) {}

  // ---------------------------------------------------------------------------------------------
  // Leave types & balances
  // ---------------------------------------------------------------------------------------------

  async listTypes(includeInactive = false): Promise<LeaveTypeDto[]> {
    const types = await this.typesRepo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    return types.map(toLeaveTypeDto);
  }

  async updateType(id: number, dto: UpdateLeaveTypeDto): Promise<LeaveTypeDto> {
    const type = await this.typesRepo.findOne({ where: { id } });
    if (!type) throw new NotFoundException('Leave type not found');
    if (dto.annualQuota !== undefined) type.annualQuota = dto.annualQuota;
    if (dto.isActive !== undefined) type.isActive = dto.isActive;
    return toLeaveTypeDto(await this.typesRepo.save(type));
  }

  /** Self, HR / ADMIN / CEO, or the user's manager. */
  private async assertCanViewUser(caller: JwtUserPayload, userId: number): Promise<void> {
    if (caller.sub === userId || VIEW_ALL_ROLES.includes(caller.role)) return;
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.managerId !== caller.sub) {
      throw new ForbiddenException("You can't view this person's leave balance");
    }
  }

  /** Yearly balance per active leave type: approved days used, days pending, days remaining. */
  async balances(userId: number, year: number, caller: JwtUserPayload): Promise<LeaveBalanceDto[]> {
    await this.assertCanViewUser(caller, userId);
    return this.computeBalances(userId, year);
  }

  /** `excludeRequestId` leaves one request out — the one being edited. */
  private async computeBalances(
    userId: number,
    year: number,
    excludeRequestId?: number,
  ): Promise<LeaveBalanceDto[]> {
    const types = await this.typesRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
    const rows = await this.requestsRepo
      .createQueryBuilder('request')
      .select('request.leaveTypeId', 'leaveTypeId')
      .addSelect(
        `COALESCE(SUM(CASE WHEN request.status IN (:...approved) THEN request.days ELSE 0 END), 0)`,
        'used',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN request.status IN (:...pending) THEN request.days ELSE 0 END), 0)`,
        'pending',
      )
      .where('request.employeeId = :userId', { userId })
      .andWhere('EXTRACT(YEAR FROM request.startDate) = :year', { year })
      // Ids start at 1, so 0 excludes nothing.
      .andWhere('request.id <> :excludeRequestId', { excludeRequestId: excludeRequestId ?? 0 })
      .setParameters({ approved: APPROVED_LIKE, pending: PENDING })
      .groupBy('request.leaveTypeId')
      .getRawMany<{ leaveTypeId: number; used: string; pending: string }>();

    return types.map((type) => {
      const row = rows.find((r) => Number(r.leaveTypeId) === type.id);
      const used = row ? parseFloat(row.used) : 0;
      const pending = row ? parseFloat(row.pending) : 0;
      return {
        leaveTypeId: type.id,
        leaveTypeName: type.name,
        annualQuota: type.annualQuota,
        used,
        pending,
        remaining:
          type.annualQuota === null ? null : Math.max(type.annualQuota - used - pending, 0),
      };
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Requests
  // ---------------------------------------------------------------------------------------------

  async findEntityForViewer(id: number, caller: JwtUserPayload): Promise<LeaveRequest> {
    const row = await this.requestsRepo.findOne({ where: { id }, relations: RELATIONS });
    if (!row) throw new NotFoundException('Leave request not found');
    const allowed =
      row.employeeId === caller.sub ||
      row.managerId === caller.sub ||
      VIEW_ALL_ROLES.includes(caller.role);
    if (!allowed) throw new ForbiddenException('You do not have access to this leave request');
    return row;
  }

  /** Bell + email (see NotifyService). `details` adds the leave's details to the email. */
  private async notify(
    userIds: (number | null | undefined)[],
    title: string,
    id: number,
    details?: { row: LeaveRequest; extra?: EmailDetailRow[]; body?: string | null },
  ): Promise<void> {
    await this.notifier.send(userIds, {
      type: 'LEAVE_REQUEST',
      title,
      link: `/dashboard/leave-requests/${id}`,
      body: details?.body ?? null,
      rows: details ? [...this.leaveRows(details.row), ...(details.extra ?? [])] : undefined,
    });
  }

  /** Employee, leave type, dates, days, reason — the core of every leave email. */
  private leaveRows(row: LeaveRequest): EmailDetailRow[] {
    return [
      { label: 'Employee', value: fullName(row.employee) },
      { label: 'Leave type', value: row.leaveType?.name ?? 'Leave' },
      { label: 'Dates', value: leaveDates(row) },
      { label: 'Days', value: `${row.days}${row.halfDay ? ' (half day)' : ''}` },
      { label: 'Reason', value: row.reason },
    ];
  }

  /**
   * Moves a request from one status to another only if it's still in the expected status — so two
   * people deciding at once (or a double click) can't both succeed and send duplicate emails.
   */
  private async transition(
    id: number,
    from: LeaveRequestStatus,
    patch: Partial<LeaveRequest>,
  ): Promise<void> {
    const result = await this.requestsRepo.update({ id, status: from }, patch);
    if (!result.affected) {
      throw new ConflictException('This leave request was just updated by someone else — refresh');
    }
  }

  private async activeHrUserIds(excludeId?: number): Promise<number[]> {
    const hrUsers = await this.usersRepo.find({
      where: { role: In([RoleName.HR, RoleName.ADMIN]), status: UserStatus.ACTIVE },
    });
    return hrUsers.map((user) => user.id).filter((id) => id !== excludeId);
  }

  /**
   * Weekend days to add because this request sits right next to another active one across a
   * weekend (the "sandwich" rule across requests): it starts on a Monday and another leave ends
   * on the Friday before, and/or it ends on a Friday and another leave starts the Monday after.
   * Half days never sandwich. When editing (`requestId`), only requests made *before* this one are
   * considered, so the weekend is always charged to the later of the two — never to both.
   */
  private async sandwichedWeekendDays(
    employeeId: number,
    startDate: string,
    endDate: string,
    requestId?: number,
  ): Promise<number> {
    const adjacent = async (column: 'endDate' | 'startDate', date: string) => {
      const qb = this.requestsRepo
        .createQueryBuilder('request')
        .where('request.employeeId = :employeeId', { employeeId })
        .andWhere('request.status IN (:...active)', { active: ACTIVE })
        .andWhere('request.halfDay = false')
        .andWhere(`request.${column} = :date`, { date });
      if (requestId) qb.andWhere('request.id < :requestId', { requestId });
      return (await qb.getCount()) > 0;
    };
    let extra = 0;
    if (weekdayOf(startDate) === 1 && (await adjacent('endDate', addDays(startDate, -3)))) {
      extra += 2;
    }
    if (weekdayOf(endDate) === 5 && (await adjacent('startDate', addDays(endDate, 3)))) {
      extra += 2;
    }
    return extra;
  }

  /**
   * The checks every new or edited request must pass — dates, half day, overlap with the
   * employee's other active requests, and the yearly balance. `requestId` is the request being
   * edited: it's left out of the overlap and balance checks. Returns the days the request costs.
   */
  private async validateRequest(
    input: { leaveTypeId: number; startDate: string; endDate: string; halfDay: boolean },
    employeeId: number,
    requestId?: number,
  ): Promise<{ type: LeaveType; days: number }> {
    const type = await this.typesRepo.findOne({
      where: { id: input.leaveTypeId, isActive: true },
    });
    if (!type) throw new BadRequestException('Choose a valid leave type');
    if (input.endDate < input.startDate) {
      throw new BadRequestException('The end date must be on or after the start date');
    }
    if (input.halfDay && input.startDate !== input.endDate) {
      throw new BadRequestException('A half day must start and end on the same date');
    }
    const leaveDays = countLeaveDays(input.startDate, input.endDate);
    if (leaveDays === 0) {
      throw new BadRequestException('Those dates are all weekend days — no leave is needed');
    }
    const days = input.halfDay
      ? 0.5
      : leaveDays +
        (await this.sandwichedWeekendDays(employeeId, input.startDate, input.endDate, requestId));

    const overlapping = this.requestsRepo
      .createQueryBuilder('request')
      .where('request.employeeId = :employeeId', { employeeId })
      .andWhere('request.status IN (:...active)', { active: ACTIVE })
      .andWhere('request.startDate <= :endDate AND request.endDate >= :startDate', {
        startDate: input.startDate,
        endDate: input.endDate,
      });
    if (requestId) overlapping.andWhere('request.id <> :requestId', { requestId });
    if (await overlapping.getCount()) {
      throw new ConflictException('There is already a leave request covering some of those dates');
    }

    if (type.annualQuota !== null) {
      const year = Number(input.startDate.slice(0, 4));
      const balance = (await this.computeBalances(employeeId, year, requestId)).find(
        (b) => b.leaveTypeId === type.id,
      );
      const remaining = balance?.remaining ?? type.annualQuota;
      if (days > remaining) {
        throw new BadRequestException(
          `Not enough ${type.name} left for ${year}: ${remaining} day(s) remaining ` +
            `(including requests still pending), ${days} requested ` +
            `(weekends between leave days count as leave)`,
        );
      }
    }
    return { type, days };
  }

  /**
   * Why a request can't be edited any more, or null while it still can: it's waiting on the
   * manager, or on HR when there's no manager (nobody has made a decision yet).
   */
  private editBlocker(row: LeaveRequest): string | null {
    if (row.status === LeaveRequestStatus.PENDING_MANAGER) return null;
    if (
      row.status === LeaveRequestStatus.PENDING_HR &&
      row.managerApproved === null &&
      !row.managerSignedAt
    ) {
      return null;
    }
    return PENDING.includes(row.status)
      ? 'Your manager has already approved this request — it can no longer be edited'
      : `This request is already ${row.status.toLowerCase().replace(/_/g, ' ')} — it can no longer be edited`;
  }

  /** The employee, or HR / Admin on their behalf, while nobody has acted on it yet. */
  private canEdit(row: LeaveRequest, caller: JwtUserPayload): boolean {
    const allowed =
      row.employeeId === caller.sub ||
      [RoleName.HR, RoleName.ADMIN].includes(caller.role as RoleName);
    return allowed && this.editBlocker(row) === null;
  }

  async create(dto: CreateLeaveRequestDto, caller: JwtUserPayload): Promise<LeaveRequestDto> {
    const { type, days } = await this.validateRequest(
      {
        leaveTypeId: dto.leaveTypeId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        halfDay: !!dto.halfDay,
      },
      caller.sub,
    );

    const employee = await this.usersRepo.findOne({ where: { id: caller.sub } });
    if (!employee) throw new NotFoundException('User not found');
    const managerId = employee.managerId ?? null;

    const saved = await this.requestsRepo.save(
      this.requestsRepo.create({
        employeeId: caller.sub,
        leaveTypeId: type.id,
        startDate: dto.startDate,
        endDate: dto.endDate,
        halfDay: !!dto.halfDay,
        days,
        reason: dto.reason.trim(),
        contactDuringLeave: dto.contactDuringLeave?.trim() || null,
        managerId,
        status: managerId ? LeaveRequestStatus.PENDING_MANAGER : LeaveRequestStatus.PENDING_HR,
      }),
    );

    const name = `${employee.firstName} ${employee.lastName}`;
    if (managerId) {
      await this.notify(
        [managerId],
        `${name} applied for ${type.name} — needs your approval`,
        saved.id,
      );
    } else {
      await this.notify(
        await this.activeHrUserIds(caller.sub),
        `${name} applied for ${type.name}`,
        saved.id,
      );
    }
    this.requestWatchers.notifyNewRequest({
      requesterId: caller.sub,
      requesterName: name,
      kind: 'Leave request',
      summary: `${type.name}: ${saved.startDate}${saved.endDate !== saved.startDate ? ` to ${saved.endDate}` : ''} (${days} day${days === 1 ? '' : 's'})`,
      link: `/dashboard/leave-requests/${saved.id}`,
    });
    return this.getOne(saved.id, caller);
  }

  /**
   * The employee (or HR / Admin on their behalf) changes a request nobody has acted on yet. Runs
   * every create check again, then tells whoever it's waiting on that the details changed.
   */
  async update(
    id: number,
    dto: UpdateLeaveRequestDto,
    caller: JwtUserPayload,
  ): Promise<LeaveRequestDto> {
    const row = await this.findEntityForViewer(id, caller);
    if (
      row.employeeId !== caller.sub &&
      ![RoleName.HR, RoleName.ADMIN].includes(caller.role as RoleName)
    ) {
      throw new ForbiddenException('Only the employee (or HR) can edit this leave request');
    }
    const blocker = this.editBlocker(row);
    if (blocker) throw new ConflictException(blocker);

    const startDate = dto.startDate ?? row.startDate;
    const endDate = dto.endDate ?? row.endDate;
    const halfDay = dto.halfDay ?? (row.halfDay && startDate === endDate);
    const { type, days } = await this.validateRequest(
      { leaveTypeId: dto.leaveTypeId ?? row.leaveTypeId, startDate, endDate, halfDay },
      row.employeeId,
      row.id,
    );
    await this.transition(id, row.status, {
      leaveTypeId: type.id,
      startDate,
      endDate,
      halfDay,
      days,
      reason: dto.reason !== undefined ? dto.reason.trim() : row.reason,
      contactDuringLeave:
        dto.contactDuringLeave !== undefined
          ? dto.contactDuringLeave.trim() || null
          : row.contactDuringLeave,
    });

    const updated = await this.findEntityForViewer(id, caller);
    const name = fullName(updated.employee);
    const approverIds = (
      updated.status === LeaveRequestStatus.PENDING_MANAGER
        ? [updated.managerId]
        : await this.activeHrUserIds(updated.employeeId)
    ).filter((userId) => userId !== caller.sub);
    await this.notify(
      approverIds,
      `${name} edited their ${type.name} request — please review the updated details`,
      id,
      { row: updated },
    );
    if (updated.employeeId !== caller.sub) {
      await this.notify([updated.employeeId], `HR updated your ${type.name} request`, id, {
        row: updated,
      });
    }
    return this.getOne(id, caller);
  }

  private async list(query: QueryLeaveRequestsDto, scope: ListScope) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const qb = this.requestsRepo
      .createQueryBuilder('row')
      .leftJoinAndSelect('row.employee', 'employee')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('row.leaveType', 'leaveType')
      .leftJoinAndSelect('row.manager', 'manager')
      .leftJoinAndSelect('row.hrUser', 'hrUser')
      .leftJoinAndSelect('row.cancellationDecidedBy', 'cancellationDecidedBy')
      .orderBy('row.startDate', 'DESC')
      .addOrderBy('row.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const ownOnly = scope !== 'all' && 'employeeId' in scope;
    if (ownOnly) qb.andWhere('row.employeeId = :employeeId', { employeeId: scope.employeeId });
    if (scope !== 'all' && 'managerId' in scope) {
      qb.andWhere('row.managerId = :managerId', { managerId: scope.managerId });
    }
    if (query.status) qb.andWhere('row.status = :status', { status: query.status });
    if (query.year) qb.andWhere('EXTRACT(YEAR FROM row.startDate) = :year', { year: query.year });
    if (query.q && !ownOnly) {
      qb.andWhere(
        "((employee.firstName || ' ' || employee.lastName) ILIKE :q OR employee.employeeCode ILIKE :q)",
        { q: `%${query.q.trim()}%` },
      );
    }
    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map(toLeaveRequestDto), meta: { total, page, limit } };
  }

  mine(query: QueryLeaveRequestsDto, caller: JwtUserPayload) {
    return this.list(query, { employeeId: caller.sub });
  }

  /** Requests where the caller is the approving manager (any role can be someone's manager). */
  team(query: QueryLeaveRequestsDto, caller: JwtUserPayload) {
    return this.list(query, { managerId: caller.sub });
  }

  listAll(query: QueryLeaveRequestsDto) {
    return this.list(query, 'all');
  }

  async getOne(id: number, caller: JwtUserPayload): Promise<LeaveRequestDto> {
    const row = await this.findEntityForViewer(id, caller);
    return { ...toLeaveRequestDto(row), canEdit: this.canEdit(row, caller) };
  }

  async managerDecision(
    id: number,
    dto: LeaveDecisionDto,
    caller: JwtUserPayload,
  ): Promise<LeaveRequestDto> {
    const row = await this.findEntityForViewer(id, caller);
    if (row.managerId !== caller.sub) {
      throw new ForbiddenException("Only the employee's manager can approve this at this stage");
    }
    if (row.status !== LeaveRequestStatus.PENDING_MANAGER) {
      throw new ConflictException(`This request is already ${row.status}`);
    }
    const remarks = dto.remarks?.trim() || null;
    await this.transition(id, LeaveRequestStatus.PENDING_MANAGER, {
      managerApproved: dto.approved,
      managerRemarks: remarks,
      managerSignatureText: dto.signatureText.trim(),
      managerSignedAt: new Date(),
      status: dto.approved ? LeaveRequestStatus.PENDING_HR : LeaveRequestStatus.REJECTED,
    });
    // Saved — now tell people.
    const leaveName = row.leaveType.name;
    const decisionRows: EmailDetailRow[] = [
      {
        label: 'Decision',
        value: dto.approved ? 'Approved by your manager — now with HR' : 'Rejected',
      },
      { label: 'Decided by', value: `${fullName(row.manager)} (line manager)` },
      ...(remarks ? [{ label: dto.approved ? 'Comments' : 'Reason', value: remarks }] : []),
    ];
    await this.notify(
      [row.employeeId],
      dto.approved
        ? `Your ${leaveName} was approved by your manager and sent to HR`
        : `Your ${leaveName} was rejected by your manager`,
      id,
      { row, extra: decisionRows },
    );
    if (dto.approved) {
      await this.notify(
        await this.activeHrUserIds(row.employeeId),
        `${fullName(row.employee)}'s ${leaveName} needs HR approval`,
        id,
        { row },
      );
    }
    return this.getOne(id, caller);
  }

  async hrDecision(
    id: number,
    dto: LeaveDecisionDto,
    caller: JwtUserPayload,
  ): Promise<LeaveRequestDto> {
    const row = await this.findEntityForViewer(id, caller);
    if (row.status !== LeaveRequestStatus.PENDING_HR) {
      throw new ConflictException(
        row.status === LeaveRequestStatus.PENDING_MANAGER
          ? "Waiting for the employee's manager to approve this first"
          : `This request is already ${row.status}`,
      );
    }
    const remarks = dto.remarks?.trim() || null;
    await this.transition(id, LeaveRequestStatus.PENDING_HR, {
      hrApproved: dto.approved,
      hrRemarks: remarks,
      hrUserId: caller.sub,
      hrSignatureText: dto.signatureText.trim(),
      hrSignedAt: new Date(),
      status: dto.approved ? LeaveRequestStatus.APPROVED : LeaveRequestStatus.REJECTED,
    });
    const hrUser = await this.usersRepo.findOne({ where: { id: caller.sub } });
    const leaveName = row.leaveType.name;
    await this.notify(
      [row.employeeId],
      dto.approved
        ? `Your ${leaveName} (${row.days} day(s)) has been approved`
        : `Your ${leaveName} was rejected by HR`,
      id,
      {
        row,
        extra: [
          { label: 'Decision', value: dto.approved ? 'Approved' : 'Rejected' },
          { label: 'Decided by', value: `${fullName(hrUser)} (HR)` },
          ...(remarks ? [{ label: dto.approved ? 'Comments' : 'Reason', value: remarks }] : []),
        ],
      },
    );
    // The manager approved it earlier — let them know the final outcome.
    if (row.managerId && row.managerId !== caller.sub) {
      await this.notify(
        [row.managerId],
        `HR ${dto.approved ? 'approved' : 'rejected'} ${fullName(row.employee)}'s ${leaveName}`,
        id,
        { row },
      );
    }
    return this.getOne(id, caller);
  }

  /** The employee withdraws their own request while it's still pending (no approval needed). */
  async cancel(id: number, caller: JwtUserPayload): Promise<LeaveRequestDto> {
    const row = await this.findEntityForViewer(id, caller);
    if (row.employeeId !== caller.sub) {
      throw new ForbiddenException('Only the employee can cancel their own leave request');
    }
    if (APPROVED_LIKE.includes(row.status)) {
      throw new ConflictException(
        'This leave is already approved — use "Request cancellation" so HR can approve it',
      );
    }
    if (!PENDING.includes(row.status)) {
      throw new ConflictException(`This request is already ${row.status.toLowerCase()}`);
    }
    await this.transition(id, row.status, { status: LeaveRequestStatus.CANCELLED });

    const leaveName = row.leaveType?.name ?? 'leave';
    const waitingOn =
      row.status === LeaveRequestStatus.PENDING_MANAGER
        ? [row.managerId]
        : await this.activeHrUserIds(caller.sub);
    await this.notify(
      waitingOn,
      `${fullName(row.employee)} withdrew their ${leaveName} request — no action needed`,
      id,
      { row },
    );
    await this.notify([row.employeeId], `You withdrew your ${leaveName} request`, id, { row });
    return this.getOne(id, caller);
  }

  /**
   * The employee asks to cancel APPROVED leave they haven't started yet. It stays approved (dates
   * and days held) until HR / Admin decide — see cancellationDecision.
   */
  async requestCancellation(
    id: number,
    dto: RequestLeaveCancellationDto,
    caller: JwtUserPayload,
  ): Promise<LeaveRequestDto> {
    const row = await this.findEntityForViewer(id, caller);
    if (row.employeeId !== caller.sub) {
      throw new ForbiddenException('Only the employee can ask to cancel their own leave');
    }
    if (row.status === LeaveRequestStatus.CANCELLATION_REQUESTED) {
      throw new ConflictException('You have already asked to cancel this leave — HR will decide');
    }
    if (row.status !== LeaveRequestStatus.APPROVED) {
      throw new ConflictException(
        PENDING.includes(row.status)
          ? 'This request is still pending — withdraw it instead'
          : `A ${row.status.toLowerCase()} request can't be cancelled`,
      );
    }
    if (row.startDate <= todayLocal()) {
      throw new ConflictException(
        'This leave has already started or been taken — it can no longer be cancelled',
      );
    }
    const reason = dto.reason.trim();
    await this.transition(id, LeaveRequestStatus.APPROVED, {
      status: LeaveRequestStatus.CANCELLATION_REQUESTED,
      cancellationReason: reason,
      cancellationRequestedAt: new Date(),
      // A fresh request — clear any earlier (rejected) decision.
      cancellationApproved: null,
      cancellationRemarks: null,
      cancellationDecidedById: null,
      cancellationDecidedAt: null,
    });

    const leaveName = row.leaveType.name;
    const extra = [{ label: 'Why cancel', value: reason }];
    await this.notify(
      await this.activeHrUserIds(caller.sub),
      `${fullName(row.employee)} asked to cancel their approved ${leaveName} — needs your decision`,
      id,
      { row, extra },
    );
    await this.notify(
      [row.managerId],
      `${fullName(row.employee)} asked HR to cancel their approved ${leaveName}`,
      id,
      { row, extra },
    );
    await this.notify(
      [row.employeeId],
      `Your request to cancel your ${leaveName} was sent to HR`,
      id,
      {
        row,
        extra,
        body: 'Your leave stays approved until HR decides. You will get an email with the decision.',
      },
    );
    return this.getOne(id, caller);
  }

  /** HR / Admin approve (→ CANCELLED, days back in the balance) or reject (→ stays APPROVED). */
  async cancellationDecision(
    id: number,
    dto: LeaveCancellationDecisionDto,
    caller: JwtUserPayload,
  ): Promise<LeaveRequestDto> {
    const row = await this.findEntityForViewer(id, caller);
    if (row.status !== LeaveRequestStatus.CANCELLATION_REQUESTED) {
      throw new ConflictException('There is no cancellation request waiting on this leave');
    }
    const remarks = dto.remarks?.trim() || null;
    await this.transition(id, LeaveRequestStatus.CANCELLATION_REQUESTED, {
      status: dto.approved ? LeaveRequestStatus.CANCELLED : LeaveRequestStatus.APPROVED,
      cancellationApproved: dto.approved,
      cancellationRemarks: remarks,
      cancellationDecidedById: caller.sub,
      cancellationDecidedAt: new Date(),
    });

    const decider = await this.usersRepo.findOne({ where: { id: caller.sub } });
    const leaveName = row.leaveType.name;
    const extra: EmailDetailRow[] = [
      {
        label: 'Decision',
        value: dto.approved
          ? 'Cancellation approved — the leave is cancelled'
          : 'Cancellation rejected — the leave stays approved',
      },
      { label: 'Decided by', value: `${fullName(decider)} (HR)` },
      ...(row.cancellationReason ? [{ label: 'Why cancel', value: row.cancellationReason }] : []),
      ...(remarks ? [{ label: dto.approved ? 'Comments' : 'Reason', value: remarks }] : []),
    ];
    await this.notify(
      [row.employeeId],
      dto.approved
        ? `Your ${leaveName} has been cancelled — the ${row.days} day(s) are back in your balance`
        : `Your request to cancel your ${leaveName} was rejected — the leave stays approved`,
      id,
      { row, extra },
    );
    if (row.managerId && row.managerId !== caller.sub) {
      await this.notify(
        [row.managerId],
        dto.approved
          ? `${fullName(row.employee)}'s ${leaveName} was cancelled`
          : `${fullName(row.employee)}'s ${leaveName} stays approved (cancellation rejected)`,
        id,
        { row, extra },
      );
    }
    return this.getOne(id, caller);
  }
}
