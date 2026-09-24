import { AuditLog } from '../../entities/audit-log.entity';

export interface AuditLogDto {
  id: number;
  actorId: number | null;
  actorName: string | null;
  action: string;
  entity: string;
  entityId: number | null;
  ipAddress: string | null;
  createdAt: string;
}

/**
 * Maps an AuditLog entity to the API's AuditLogDto shape. `before`/`after` are intentionally
 * omitted, per the gap-fix doc. Requires the `actor` relation to be loaded for `actorName`.
 */
export function toAuditLogDto(log: AuditLog): AuditLogDto {
  return {
    id: log.id,
    actorId: log.actorId,
    actorName: log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : null,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt.toISOString(),
  };
}
