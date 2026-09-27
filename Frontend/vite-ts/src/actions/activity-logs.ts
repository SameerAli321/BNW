import type { SWRConfiguration } from 'swr';
import type {
  ActivityLogDto,
  ActivityLogListMeta,
  CreateActivityLogDto,
  UpdateActivityLogDto,
} from 'src/types/activity-log';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — Daily activity log data layer, wired to the real backend per
// docs/API_CONTRACT_ACTIVITY_LOG.md. Same template SWR pattern as src/actions/appraisals.ts.

const swrOptions: SWRConfiguration = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

function cleanParams(filters: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')
  );
}

export type ActivityLogScope = 'mine' | 'team' | 'all';

export type ActivityLogQuery = {
  from?: string;
  to?: string;
  category?: string;
  q?: string;
  role?: string;
  page?: number;
  limit?: number;
};

type ActivityLogListResponse = { data: ActivityLogDto[]; meta: ActivityLogListMeta };

const SCOPE_URL: Record<ActivityLogScope, string> = {
  mine: endpoints.activityLogs.mine,
  team: endpoints.activityLogs.team,
  all: endpoints.activityLogs.list,
};

/**
 * GET /activity-logs/mine (self), /activity-logs/team (MANAGER — direct reports) or
 * /activity-logs (CEO/ADMIN — everyone). `enabled` skips the fetch entirely via SWR's
 * conditional-key pattern, so a role never calls an endpoint it isn't allowed to.
 */
export function useGetActivityLogs(
  scope: ActivityLogScope,
  query: ActivityLogQuery = {},
  enabled = true
) {
  const params = cleanParams(query);
  const key = enabled ? [SCOPE_URL[scope], { params }] : null;

  const { data, isLoading, error, isValidating } = useSWR<ActivityLogListResponse>(
    key,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      logs: data?.data || [],
      logsMeta: data?.meta,
      logsLoading: isLoading,
      logsError: error,
      logsValidating: isValidating,
    }),
    [data?.data, data?.meta, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------
// Mutations — always the caller's own entries

function revalidateActivityLogLists() {
  const urls: string[] = Object.values(SCOPE_URL);
  return mutate((key) => Array.isArray(key) && urls.includes(key[0]));
}

/** POST /activity-logs — 400 for a future date or a day totalling more than 24 hours. */
export async function createActivityLog(payload: CreateActivityLogDto): Promise<ActivityLogDto> {
  const res = await axiosInstance.post(endpoints.activityLogs.list, payload);
  await revalidateActivityLogLists();
  return res.data.data;
}

/** PATCH /activity-logs/:id — owner only. */
export async function updateActivityLog(
  id: number | string,
  payload: UpdateActivityLogDto
): Promise<ActivityLogDto> {
  const res = await axiosInstance.patch(endpoints.activityLogs.details(id), payload);
  await revalidateActivityLogLists();
  return res.data.data;
}

/** DELETE /activity-logs/:id — owner only. */
export async function deleteActivityLog(id: number | string): Promise<void> {
  await axiosInstance.delete(endpoints.activityLogs.details(id));
  await revalidateActivityLogLists();
}
