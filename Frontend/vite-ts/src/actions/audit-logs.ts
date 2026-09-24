import type { SWRConfiguration } from 'swr';
import type { AuditLogDto, IAuditLogListMeta } from 'src/types/audit-log';

import useSWR from 'swr';
import { useMemo } from 'react';

import { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — Gap-fix data layer (Gap 2, `audit_logs`), see docs/API_CONTRACT_GAPS_FIX.md. Same
// template SWR pattern as src/actions/users.ts. Read-only — append-only on the backend, no
// create/update/delete from the frontend.

const swrOptions: SWRConfiguration = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

export type AuditLogsListFilters = {
  actorId?: number;
  entity?: string;
  action?: string;
  page?: number;
  limit?: number;
};

type AuditLogsListResponse = { data: AuditLogDto[]; meta: IAuditLogListMeta };

/** GET /audit-logs — CEO, ADMIN only. */
export function useGetAuditLogs(filters: AuditLogsListFilters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')
  );

  const { data, isLoading, error, isValidating } = useSWR<AuditLogsListResponse>(
    [endpoints.auditLogs, { params }],
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      auditLogs: data?.data || [],
      auditLogsMeta: data?.meta,
      auditLogsLoading: isLoading,
      auditLogsError: error,
      auditLogsValidating: isValidating,
      auditLogsEmpty: !isLoading && !data?.data.length,
    }),
    [data?.data, data?.meta, error, isLoading, isValidating]
  );

  return memoizedValue;
}
