// ----------------------------------------------------------------------
// BNW OMS — Gap-fix types, mirroring docs/API_CONTRACT_GAPS_FIX.md exactly (Gap 2 —
// `audit_logs`). Keep in sync with that file; if either side needs to change this shape, update
// the contract doc first. Companion to src/types/user.ts, src/types/employee-record.ts.

/**
 * `AuditLogDto` — contract Gap 2. `GET /audit-logs` (CEO, ADMIN only), append-only, no
 * update/delete. `before`/`after` are intentionally omitted from the DTO (internal diff data, not
 * needed by a simple audit trail list view).
 */
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

export type IAuditLogListMeta = { total: number; page: number; limit: number };

export type IAuditLogTableFilters = {
  entity: string;
  action: string;
};
