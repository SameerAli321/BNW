import useSWR from 'swr';
import { useMemo } from 'react';

import { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — the dashboard "Team status" table. Mirrors Backend/src/dashboard/team-status.service.ts.
// CEO / HR / ADMIN see everyone; Team Leads (MANAGER) see their direct reports.

export const TEAM_STATUS_ROLES = ['CEO', 'HR', 'ADMIN', 'MANAGER'];

export type TodayStatus = 'AVAILABLE' | 'ON_LEAVE' | 'IN_MEETING' | 'INACTIVE';

export interface TeamStatusRow {
  id: number;
  name: string;
  employeeCode: string | null;
  email: string;
  designation: string | null;
  role: string;
  department: string | null;
  manager: string | null;
  accountStatus: string;
  joinDate: string | null;
  today: { status: TodayStatus; detail: string | null };
  leave: {
    taken: number;
    pendingDays: number;
    remaining: number;
    next: { startDate: string; endDate: string; type: string } | null;
  };
  pending: {
    leave: number;
    attendance: number;
    workOrders: number;
    appraisals: number;
    lettersToSign: number;
    total: number;
  };
}

export interface TeamStatusSummary {
  total: number;
  available: number;
  onLeave: number;
  inMeeting: number;
  inactive: number;
  withPending: number;
}

export type TeamStatusFilters = {
  search?: string;
  departmentId?: number | '';
  status?: TodayStatus | '';
  hasPending?: boolean;
  page?: number;
  limit?: number;
};

type Response = {
  data: TeamStatusRow[];
  meta: { total: number; page: number; limit: number };
  summary: TeamStatusSummary;
  scope: 'all' | 'team';
};

export function useGetTeamStatus(filters: TeamStatusFilters, enabled = true) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== '' && v !== false)
  );
  const { data, isLoading, isValidating, error, mutate } = useSWR<Response>(
    enabled ? [endpoints.teamStatus, { params }] : null,
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: true, refreshInterval: 120_000 }
  );

  return useMemo(
    () => ({
      rows: data?.data ?? [],
      total: data?.meta.total ?? 0,
      summary: data?.summary,
      scope: data?.scope,
      loading: isLoading,
      validating: isValidating,
      error,
      retry: mutate,
    }),
    [data, isLoading, isValidating, error, mutate]
  );
}
