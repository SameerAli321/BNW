import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AttendanceRegularization } from '../entities/attendance-regularization.entity';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import {
  AttendanceHrDecision,
  AttendanceRegularizationStatus,
} from '../common/enums/attendance-regularization.enum';
import { RoleName } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import {
  AttendanceRegularizationDto,
  toAttendanceRegularizationDto,
} from '../common/mappers/attendance-regularization.mapper';
import { CreateAttendanceRegularizationDto } from './dto/create-attendance-regularization.dto';
import { HodRecommendationDto } from './dto/hod-recommendation.dto';
import { HrDecisionDto } from './dto/hr-decision.dto';
import { QueryAttendanceRegularizationsDto } from './dto/query-attendance-regularizations.dto';

const VIEW_ALL_ROLES: string[] = [RoleName.HR, RoleName.ADMIN, RoleName.CEO];
const RELATIONS = ['employee', 'employee.department', 'hod', 'hrUser'];

export type AttendanceRegularizationListResult = {
  data: AttendanceRegularizationDto[];
  meta: { total: number; page: number; limit: number };
};

type ListScope = { employeeId: number } | { hodId: number } | 'all';

/** Today's date as 'YYYY-MM-DD' in the server's local timezone. */
function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

@Injectable()
export class AttendanceRegularizationsService {
  constructor(
    @InjectRepository(AttendanceRegularization)
    private readonly repo: Repository<AttendanceRegularization>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
  ) {}

  /** Employee, their HOD, or HR / ADMIN / CEO. */
  async findEntityForViewer(id: number, caller: JwtUserPayload): Promise<AttendanceRegularization> {
    const row = await this.repo.findOne({ where: { id }, relations: RELATIONS });
    if (!row) {
      throw new NotFoundException('Attendance regularization not found');
    }
    const allowed =
      row.employeeId === caller.sub ||
      row.hodId === caller.sub ||
      VIEW_ALL_ROLES.includes(caller.role);
    if (!allowed) {
      throw new ForbiddenException('You do not have access to this form');
    }
    return row;
  }

  private async notify(userIds: number[], title: string, id: number): Promise<void> {
    if (!userIds.length) return;
    await this.notificationsRepo.save(
      userIds.map((userId) =>
        this.notificationsRepo.create({
          userId,
          type: 'ATTENDANCE_REGULARIZATION',
          title,
          body: null,
          link: `/dashboard/attendance-regularizations/${id}`,
        }),
      ),
    );
  }

  private async activeHrUserIds(): Promise<number[]> {
    const hrUsers = await this.usersRepo.find({
      where: { role: In([RoleName.HR]), status: UserStatus.ACTIVE },
    });
    return hrUsers.map((user) => user.id);
  }

  async create(
    dto: CreateAttendanceRegularizationDto,
    caller: JwtUserPayload,
  ): Promise<AttendanceRegularizationDto> {
    if (dto.attendanceDate > todayLocal()) {
      throw new BadRequestException('You cannot regularize attendance for a future date');
    }
    if (!dto.timeArrival && !dto.timeDeparture) {
      throw new BadRequestException('Enter the arrival time, the departure time, or both');
    }
    const employee = await this.usersRepo.findOne({ where: { id: caller.sub } });
    if (!employee) {
      throw new NotFoundException('User not found');
    }

    // The employee's manager is their head of department. With no manager on record the form
    // goes straight to HR.
    const hodId = employee.managerId ?? null;
    const saved = await this.repo.save(
      this.repo.create({
        employeeId: caller.sub,
        attendanceDate: dto.attendanceDate,
        timeArrival: dto.timeArrival || null,
        timeDeparture: dto.timeDeparture || null,
        reason: dto.reason.trim(),
        hodId,
        status: hodId
          ? AttendanceRegularizationStatus.PENDING_HOD
          : AttendanceRegularizationStatus.PENDING_HR,
      }),
    );

    const name = `${employee.firstName} ${employee.lastName}`;
    if (hodId) {
      await this.notify(
        [hodId],
        `Attendance regularization from ${name} needs your recommendation`,
        saved.id,
      );
    } else {
      await this.notify(
        await this.activeHrUserIds(),
        `Attendance regularization from ${name}`,
        saved.id,
      );
    }
    return this.getOne(saved.id, caller);
  }

  private async list(
    query: QueryAttendanceRegularizationsDto,
    scope: ListScope,
  ): Promise<AttendanceRegularizationListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const qb = this.repo
      .createQueryBuilder('row')
      .leftJoinAndSelect('row.employee', 'employee')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('row.hod', 'hod')
      .leftJoinAndSelect('row.hrUser', 'hrUser')
      .orderBy('row.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (scope !== 'all' && 'employeeId' in scope) {
      qb.andWhere('row.employeeId = :employeeId', { employeeId: scope.employeeId });
    }
    if (scope !== 'all' && 'hodId' in scope) {
      qb.andWhere('row.hodId = :hodId', { hodId: scope.hodId });
    }
    if (query.status) {
      qb.andWhere('row.status = :status', { status: query.status });
    }
    if (query.q && !(scope !== 'all' && 'employeeId' in scope)) {
      qb.andWhere(
        "((employee.firstName || ' ' || employee.lastName) ILIKE :q OR employee.employeeCode ILIKE :q)",
        { q: `%${query.q.trim()}%` },
      );
    }
    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map(toAttendanceRegularizationDto), meta: { total, page, limit } };
  }

  mine(query: QueryAttendanceRegularizationsDto, caller: JwtUserPayload) {
    return this.list(query, { employeeId: caller.sub });
  }

  /** Forms where the caller is the head of department (any role can be someone's manager). */
  team(query: QueryAttendanceRegularizationsDto, caller: JwtUserPayload) {
    return this.list(query, { hodId: caller.sub });
  }

  listAll(query: QueryAttendanceRegularizationsDto) {
    return this.list(query, 'all');
  }

  async getOne(id: number, caller: JwtUserPayload): Promise<AttendanceRegularizationDto> {
    return toAttendanceRegularizationDto(await this.findEntityForViewer(id, caller));
  }

  async hodRecommendation(
    id: number,
    dto: HodRecommendationDto,
    caller: JwtUserPayload,
  ): Promise<AttendanceRegularizationDto> {
    const row = await this.findEntityForViewer(id, caller);
    if (row.hodId !== caller.sub) {
      throw new ForbiddenException("Only the employee's head of department can recommend this");
    }
    if (row.status !== AttendanceRegularizationStatus.PENDING_HOD) {
      throw new ConflictException(`This form is already ${row.status} — nothing to recommend`);
    }
    await this.repo.update(id, {
      hodRecommended: dto.recommended,
      hodRemarks: dto.remarks?.trim() || null,
      hodSignatureText: dto.signatureText.trim(),
      hodSignedAt: new Date(),
      status: dto.recommended
        ? AttendanceRegularizationStatus.PENDING_HR
        : AttendanceRegularizationStatus.HOD_NOT_RECOMMENDED,
    });

    const name = `${row.employee.firstName} ${row.employee.lastName}`;
    await this.notify(
      [row.employeeId],
      dto.recommended
        ? 'Your attendance regularization was recommended and sent to HR'
        : 'Your attendance regularization was not recommended',
      id,
    );
    if (dto.recommended) {
      await this.notify(await this.activeHrUserIds(), `Attendance regularization from ${name}`, id);
    }
    return this.getOne(id, caller);
  }

  async hrDecision(
    id: number,
    dto: HrDecisionDto,
    caller: JwtUserPayload,
  ): Promise<AttendanceRegularizationDto> {
    const row = await this.findEntityForViewer(id, caller);
    // HR records the outcome once the HOD has acted (either way), or directly when there's no HOD.
    const decidable = [
      AttendanceRegularizationStatus.PENDING_HR,
      AttendanceRegularizationStatus.HOD_NOT_RECOMMENDED,
    ];
    if (!decidable.includes(row.status)) {
      throw new ConflictException(
        row.status === AttendanceRegularizationStatus.PENDING_HOD
          ? 'Waiting for the head of department to recommend this first'
          : `HR has already recorded this form (${row.status})`,
      );
    }
    await this.repo.update(id, {
      hrDecision: dto.decision,
      hrRemarks: dto.remarks?.trim() || null,
      hrUserId: caller.sub,
      hrSignatureText: dto.signatureText.trim(),
      hrSignedAt: new Date(),
      status:
        dto.decision === AttendanceHrDecision.TAKEN_ON_RECORD
          ? AttendanceRegularizationStatus.TAKEN_ON_RECORD
          : AttendanceRegularizationStatus.NOT_IN_ORDER,
    });
    await this.notify(
      [row.employeeId],
      dto.decision === AttendanceHrDecision.TAKEN_ON_RECORD
        ? 'Your attendance regularization was taken on record by HR'
        : 'Your attendance regularization was marked not in order by HR',
      id,
    );
    return this.getOne(id, caller);
  }
}
