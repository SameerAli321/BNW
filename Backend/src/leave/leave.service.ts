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

/** Mon–Fri days between two 'YYYY-MM-DD' dates, inclusive. */
export function countWorkingDays(startDate: string, endDate: string): number {
  const current = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  let days = 0;
  while (current <= end) {
    const weekday = current.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
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

  private async computeBalances(userId: number, year: number): Promise<LeaveBalanceDto[]> {
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

  async create(dto: CreateLeaveRequestDto, caller: JwtUserPayload): Promise<LeaveRequestDto> {
    const type = await this.typesRepo.findOne({ where: { id: dto.leaveTypeId, isActive: true } });
    if (!type) throw new BadRequestException('Choose a valid leave type');
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('The end date must be on or after the start date');
    }
    if (dto.halfDay && dto.startDate !== dto.endDate) {
      throw new BadRequestException('A half day must start and end on the same date');
    }
    const workingDays = countWorkingDays(dto.startDate, dto.endDate);
    if (workingDays === 0) {
      throw new BadRequestException('Those dates are all weekend days — no leave is needed');
    }
    const days = dto.halfDay ? 0.5 : workingDays;

    const overlapping = await this.requestsRepo
      .createQueryBuilder('request')
      .where('request.employeeId = :employeeId', { employeeId: caller.sub })
      .andWhere('request.status IN (:...active)', { active: ACTIVE })
      .andWhere('request.startDate <= :endDate AND request.endDate >= :startDate', {
        startDate: dto.startDate,
        endDate: dto.endDate,
      })
      .getCount();
    if (overlapping) {
      throw new ConflictException('You already have a leave request covering some of those dates');
    }

    if (type.annualQuota !== null) {
      const year = Number(dto.startDate.slice(0, 4));
      const balance = (await this.computeBalances(caller.sub, year)).find(
        (b) => b.leaveTypeId === type.id,
      );
      const remaining = balance?.remaining ?? type.annualQuota;
      if (days > remaining) {
        throw new BadRequestException(
          `Not enough ${type.name} left for ${year}: ${remaining} day(s) remaining ` +
            `(including requests still pending), ${days} requested`,
        );
      }
    }

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
    return toLeaveRequestDto(await this.findEntityForViewer(id, caller));
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
