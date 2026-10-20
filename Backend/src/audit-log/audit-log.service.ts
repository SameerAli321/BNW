import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditLogDto, toAuditLogDto } from '../common/mappers/audit-log.mapper';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { pktToDate } from '../interviews/interview-emails';

export interface LogAuditEntryParams {
  actorId: number | null;
  action: string;
  entity: string;
  entityId?: number | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuditLogService {
  constructor(@InjectRepository(AuditLog) private readonly auditLogRepo: Repository<AuditLog>) {}

  /**
   * Fire-and-forget: writes an audit_logs row without blocking the caller's response. Errors are
   * swallowed (logged to console) — an audit-log write failure must never fail the request it's
   * describing. Callers do NOT `await` this.
   */
  log(params: LogAuditEntryParams): void {
    const entry = this.auditLogRepo.create({
      actorId: params.actorId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      before: params.before ?? null,
      after: params.after ?? null,
      ipAddress: params.ipAddress ?? null,
    });
    this.auditLogRepo.save(entry).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[audit-log] failed to write entry:', err);
    });
  }

  async findAll(
    query: QueryAuditLogsDto,
  ): Promise<{ data: AuditLogDto[]; meta: { total: number; page: number; limit: number } }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;

    const qb = this.auditLogRepo.createQueryBuilder('log').leftJoinAndSelect('log.actor', 'actor');

    if (query.actorId) {
      qb.andWhere('log.actorId = :actorId', { actorId: query.actorId });
    }
    if (query.entity) {
      qb.andWhere('log.entity = :entity', { entity: query.entity });
    }
    if (query.action) {
      qb.andWhere('log.action = :action', { action: query.action });
    }
    // from / to are whole Pakistan-time days, both inclusive: [start of `from`, start of the day
    // after `to`).
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException('The "to" date cannot be before the "from" date');
    }
    if (query.from) {
      qb.andWhere('log.createdAt >= :fromAt', { fromAt: pktToDate(query.from, '00:00') });
    }
    if (query.to) {
      const toAt = pktToDate(query.to, '00:00');
      toAt.setUTCDate(toAt.getUTCDate() + 1);
      qb.andWhere('log.createdAt < :toAt', { toAt });
    }

    qb.orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map(toAuditLogDto), meta: { total, page, limit } };
  }
}
