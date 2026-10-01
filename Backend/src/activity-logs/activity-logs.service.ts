import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { DailyActivityLog } from '../entities/daily-activity-log.entity';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import { ActivityLogDto, toActivityLogDto } from '../common/mappers/activity-log.mapper';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { UpdateActivityLogDto } from './dto/update-activity-log.dto';
import { QueryActivityLogsDto } from './dto/query-activity-logs.dto';

const MAX_HOURS_PER_DAY = 24;

export type ActivityLogListResult = {
  data: ActivityLogDto[];
  meta: { total: number; page: number; limit: number; totalHours: number };
};

/** Today's date as 'YYYY-MM-DD' in the server's local timezone. */
function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectRepository(DailyActivityLog)
    private readonly logsRepo: Repository<DailyActivityLog>,
  ) {}

  // ---------------------------------------------------------------------------------------------
  // Validation helpers
  // ---------------------------------------------------------------------------------------------

  private assertNotFuture(activityDate: string): void {
    // 'YYYY-MM-DD' strings compare correctly as plain strings.
    if (activityDate > todayLocal()) {
      throw new BadRequestException('You cannot log activity for a future date');
    }
  }

  /** Rejects an entry that would push the user's total for that day past 24 hours. */
  private async assertDayTotal(
    userId: number,
    activityDate: string,
    hours: number,
    excludeId?: number,
  ): Promise<void> {
    const qb = this.logsRepo
      .createQueryBuilder('log')
      .select('COALESCE(SUM(log.hours), 0)', 'total')
      .where('log.userId = :userId', { userId })
      .andWhere('log.activityDate = :activityDate', { activityDate });
    if (excludeId) {
      qb.andWhere('log.id != :excludeId', { excludeId });
    }
    const row = await qb.getRawOne<{ total: string }>();
    const existing = parseFloat(row?.total ?? '0');
    if (existing + hours > MAX_HOURS_PER_DAY) {
      throw new BadRequestException(
        `That would bring your total for ${activityDate} to ${existing + hours} hours — ` +
          `a day can't have more than ${MAX_HOURS_PER_DAY}`,
      );
    }
  }

  private async findOwned(id: number, caller: JwtUserPayload): Promise<DailyActivityLog> {
    const log = await this.logsRepo.findOne({ where: { id } });
    if (!log) {
      throw new NotFoundException('Activity log entry not found');
    }
    if (log.userId !== caller.sub) {
      throw new ForbiddenException('You can only change your own activity log entries');
    }
    return log;
  }

  private async loadWithUser(id: number): Promise<DailyActivityLog> {
    const log = await this.logsRepo.findOne({ where: { id }, relations: ['user'] });
    if (!log) {
      throw new NotFoundException('Activity log entry not found');
    }
    return log;
  }

  // ---------------------------------------------------------------------------------------------
  // Writes — always the caller's own entries
  // ---------------------------------------------------------------------------------------------

  async create(dto: CreateActivityLogDto, caller: JwtUserPayload): Promise<ActivityLogDto> {
    this.assertNotFuture(dto.activityDate);
    await this.assertDayTotal(caller.sub, dto.activityDate, dto.hours);

    const saved = await this.logsRepo.save(
      this.logsRepo.create({
        userId: caller.sub,
        activityDate: dto.activityDate,
        category: dto.category,
        hours: dto.hours,
        description: dto.description,
      }),
    );
    return toActivityLogDto(await this.loadWithUser(saved.id));
  }

  async update(
    id: number,
    dto: UpdateActivityLogDto,
    caller: JwtUserPayload,
  ): Promise<ActivityLogDto> {
    const log = await this.findOwned(id, caller);

    const activityDate = dto.activityDate ?? log.activityDate;
    const hours = dto.hours ?? log.hours;
    this.assertNotFuture(activityDate);
    await this.assertDayTotal(caller.sub, activityDate, hours, log.id);

    Object.assign(log, {
      activityDate,
      hours,
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
    });
    await this.logsRepo.save(log);
    return toActivityLogDto(await this.loadWithUser(id));
  }

  async remove(id: number, caller: JwtUserPayload): Promise<void> {
    const log = await this.findOwned(id, caller);
    await this.logsRepo.remove(log);
  }

  // ---------------------------------------------------------------------------------------------
  // Reads — scope is decided by which endpoint was called, filters are shared
  // ---------------------------------------------------------------------------------------------

  async mine(query: QueryActivityLogsDto, caller: JwtUserPayload): Promise<ActivityLogListResult> {
    const qb = this.baseQuery().andWhere('log.userId = :callerId', { callerId: caller.sub });
    this.applyDateAndCategory(qb, query);
    return this.paginate(qb, query);
  }

  /** A manager's direct reports only (users whose managerId is the caller) — not the caller. */
  async team(query: QueryActivityLogsDto, caller: JwtUserPayload): Promise<ActivityLogListResult> {
    const qb = this.baseQuery().andWhere('user.managerId = :callerId', { callerId: caller.sub });
    this.applyDateAndCategory(qb, query);
    this.applyPeopleFilters(qb, query);
    return this.paginate(qb, query);
  }

  /** Everyone — CEO/ADMIN. The CEO's "Managers" view is this with `role=MANAGER`. */
  async listAll(query: QueryActivityLogsDto): Promise<ActivityLogListResult> {
    const qb = this.baseQuery();
    this.applyDateAndCategory(qb, query);
    this.applyPeopleFilters(qb, query);
    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }
    if (query.departmentId) {
      qb.andWhere('user.departmentId = :departmentId', { departmentId: query.departmentId });
    }
    return this.paginate(qb, query);
  }

  // Inner join so entries of soft-deleted users drop out of every list.
  private baseQuery(): SelectQueryBuilder<DailyActivityLog> {
    return this.logsRepo.createQueryBuilder('log').innerJoinAndSelect('log.user', 'user');
  }

  private applyDateAndCategory(
    qb: SelectQueryBuilder<DailyActivityLog>,
    query: QueryActivityLogsDto,
  ): void {
    if (query.from) {
      qb.andWhere('log.activityDate >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('log.activityDate <= :to', { to: query.to });
    }
    if (query.category) {
      qb.andWhere('log.category = :category', { category: query.category });
    }
  }

  private applyPeopleFilters(
    qb: SelectQueryBuilder<DailyActivityLog>,
    query: QueryActivityLogsDto,
  ): void {
    if (query.userId) {
      qb.andWhere('log.userId = :userId', { userId: query.userId });
    }
    if (query.q) {
      qb.andWhere('(user.firstName ILIKE :q OR user.lastName ILIKE :q OR user.email ILIKE :q)', {
        q: `%${query.q}%`,
      });
    }
  }

  private async paginate(
    qb: SelectQueryBuilder<DailyActivityLog>,
    query: QueryActivityLogsDto,
  ): Promise<ActivityLogListResult> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 25;

    // Total hours across every matching row (not just this page) — cloned before ordering/paging,
    // since Postgres rejects ORDER BY on non-grouped columns alongside an aggregate.
    const sum = await qb
      .clone()
      .select('COALESCE(SUM(log.hours), 0)', 'totalHours')
      .getRawOne<{ totalHours: string }>();
    const totalHours = sum?.totalHours ?? '0';

    qb.orderBy('log.activityDate', 'DESC')
      .addOrderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map(toActivityLogDto),
      meta: { total, page, limit, totalHours: parseFloat(totalHours) },
    };
  }
}
