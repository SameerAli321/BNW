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
import { QueryLeaveRequestsDto } from './dto/query-leave-requests.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';

const VIEW_ALL_ROLES: string[] = [RoleName.HR, RoleName.ADMIN, RoleName.CEO];
const RELATIONS = ['employee', 'employee.department', 'leaveType', 'manager', 'hrUser'];
const PENDING = [LeaveRequestStatus.PENDING_MANAGER, LeaveRequestStatus.PENDING_HR];
// Requests that hold the dates / count against the balance.
const ACTIVE = [...PENDING, LeaveRequestStatus.APPROVED];

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

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(LeaveRequest) private readonly requestsRepo: Repository<LeaveRequest>,
    @InjectRepository(LeaveType) private readonly typesRepo: Repository<LeaveType>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
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
        `COALESCE(SUM(CASE WHEN request.status = :approved THEN request.days ELSE 0 END), 0)`,
        'used',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN request.status IN (:...pending) THEN request.days ELSE 0 END), 0)`,
        'pending',
      )
      .where('request.employeeId = :userId', { userId })
      .andWhere('EXTRACT(YEAR FROM request.startDate) = :year', { year })
      .setParameters({ approved: LeaveRequestStatus.APPROVED, pending: PENDING })
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

  private async notify(userIds: number[], title: string, id: number): Promise<void> {
    if (!userIds.length) return;
    await this.notificationsRepo.save(
      userIds.map((userId) =>
        this.notificationsRepo.create({
          userId,
          type: 'LEAVE_REQUEST',
          title,
          body: null,
          link: `/dashboard/leave-requests/${id}`,
        }),
      ),
    );
  }

  private async activeHrUserIds(excludeId?: number): Promise<number[]> {
    const hrUsers = await this.usersRepo.find({
      where: { role: In([RoleName.HR]), status: UserStatus.ACTIVE },
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
    await this.requestsRepo.update(id, {
      managerApproved: dto.approved,
      managerRemarks: dto.remarks?.trim() || null,
      managerSignatureText: dto.signatureText.trim(),
      managerSignedAt: new Date(),
      status: dto.approved ? LeaveRequestStatus.PENDING_HR : LeaveRequestStatus.REJECTED,
    });
    const name = `${row.employee.firstName} ${row.employee.lastName}`;
    await this.notify(
      [row.employeeId],
      dto.approved
        ? `Your ${row.leaveType.name} was approved by your manager and sent to HR`
        : `Your ${row.leaveType.name} was not approved by your manager`,
      id,
    );
    if (dto.approved) {
      await this.notify(
        await this.activeHrUserIds(row.employeeId),
        `${name}'s ${row.leaveType.name} needs HR approval`,
        id,
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
    await this.requestsRepo.update(id, {
      hrApproved: dto.approved,
      hrRemarks: dto.remarks?.trim() || null,
      hrUserId: caller.sub,
      hrSignatureText: dto.signatureText.trim(),
      hrSignedAt: new Date(),
      status: dto.approved ? LeaveRequestStatus.APPROVED : LeaveRequestStatus.REJECTED,
    });
    await this.notify(
      [row.employeeId],
      dto.approved
        ? `Your ${row.leaveType.name} (${row.days} day(s)) has been approved`
        : `Your ${row.leaveType.name} was not approved by HR`,
      id,
    );
    return this.getOne(id, caller);
  }

  /** The employee withdraws their own request while it's still pending. */
  async cancel(id: number, caller: JwtUserPayload): Promise<LeaveRequestDto> {
    const row = await this.findEntityForViewer(id, caller);
    if (row.employeeId !== caller.sub) {
      throw new ForbiddenException('Only the employee can cancel their own leave request');
    }
    if (!PENDING.includes(row.status)) {
      throw new ConflictException(
        'Only a pending request can be cancelled — ask HR to change an approved one',
      );
    }
    await this.requestsRepo.update(id, { status: LeaveRequestStatus.CANCELLED });
    return this.getOne(id, caller);
  }
}
