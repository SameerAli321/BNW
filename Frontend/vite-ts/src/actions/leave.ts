import type { SWRConfiguration } from 'swr';
import type {
  LeaveTypeDto,
  LeaveListMeta,
  LeaveBalanceDto,
  LeaveRequestDto,
  LeaveDecisionDto,
  CreateLeaveRequestDto,
} from 'src/types/leave';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import { downloadBlob } from 'src/utils/download-blob';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — Leave / holiday data layer. Same template SWR pattern as
// src/actions/attendance-regularizations.ts.

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

// ----------------------------------------------------------------------
// Leave types & balances

/** GET /leave-types — everyone; `includeInactive` for the HR / Admin policy editor. */
export function useGetLeaveTypes(includeInactive = false) {
  const key = [endpoints.leaveTypes.list, { params: includeInactive ? { includeInactive } : {} }];
  const { data, isLoading } = useSWR<{ data: LeaveTypeDto[] }>(key, fetcher, swrOptions);
  return useMemo(
    () => ({ leaveTypes: data?.data || [], leaveTypesLoading: isLoading }),
    [data?.data, isLoading]
  );
}

/** PUT /leave-types/:id — HR / ADMIN. */
export async function updateLeaveType(
  id: number,
  payload: { annualQuota?: number | null; isActive?: boolean }
): Promise<LeaveTypeDto> {
  const res = await axiosInstance.put(endpoints.leaveTypes.details(id), payload);
  await mutate((key) => Array.isArray(key) && key[0] === endpoints.leaveTypes.list);
  await mutate((key) => Array.isArray(key) && String(key[0]).startsWith('/leave-requests/balance'));
  return res.data.data;
}

/** GET /leave-requests/balance/:userId — self, their manager, or HR / ADMIN / CEO. */
export function useGetLeaveBalance(userId?: number, year?: number) {
  const key = userId
    ? [endpoints.leaveRequests.balance(userId), { params: year ? { year } : {} }]
    : null;
  const { data, isLoading } = useSWR<{ data: LeaveBalanceDto[] }>(key, fetcher, swrOptions);
  return useMemo(
    () => ({ balances: data?.data || [], balancesLoading: isLoading }),
    [data?.data, isLoading]
  );
}

// ----------------------------------------------------------------------
// Requests

export type LeaveScope = 'mine' | 'team' | 'all';

export type LeaveQuery = {
  status?: string;
  q?: string;
  year?: number;
  page?: number;
  limit?: number;
};

const SCOPE_URL: Record<LeaveScope, string> = {
  mine: endpoints.leaveRequests.mine,
  team: endpoints.leaveRequests.team,
  all: endpoints.leaveRequests.list,
};

export function useGetLeaveRequests(scope: LeaveScope, query: LeaveQuery = {}, enabled = true) {
  const key = enabled ? [SCOPE_URL[scope], { params: cleanParams(query) }] : null;
  const { data, isLoading, error } = useSWR<{ data: LeaveRequestDto[]; meta: LeaveListMeta }>(
    key,
    fetcher,
    swrOptions
  );
  return useMemo(
    () => ({
      requests: data?.data || [],
      requestsMeta: data?.meta,
      requestsLoading: isLoading,
      requestsError: error,
    }),
    [data?.data, data?.meta, error, isLoading]
  );
}

export function useGetLeaveRequest(id?: number | string) {
  const url = id ? endpoints.leaveRequests.details(id) : '';
  const { data, isLoading, error } = useSWR<{ data: LeaveRequestDto }>(url, fetcher, swrOptions);
  return useMemo(
    () => ({ request: data?.data, requestLoading: isLoading, requestError: error }),
    [data?.data, error, isLoading]
  );
}

async function revalidate(id?: number | string, updated?: LeaveRequestDto) {
  if (id && updated) {
    await mutate(endpoints.leaveRequests.details(id), { data: updated }, false);
  }
  const urls: string[] = Object.values(SCOPE_URL);
  await mutate((key) => Array.isArray(key) && urls.includes(key[0]));
  await mutate((key) => Array.isArray(key) && String(key[0]).startsWith('/leave-requests/balance'));
}

/** POST /leave-requests — 400 for weekend-only dates / not enough balance, 409 for overlap. */
export async function createLeaveRequest(payload: CreateLeaveRequestDto): Promise<LeaveRequestDto> {
  const res = await axiosInstance.post(endpoints.leaveRequests.list, payload);
  await revalidate();
  return res.data.data;
}

export async function submitLeaveManagerDecision(
  id: number | string,
  payload: LeaveDecisionDto
): Promise<LeaveRequestDto> {
  const res = await axiosInstance.post(endpoints.leaveRequests.managerDecision(id), payload);
  await revalidate(id, res.data.data);
  return res.data.data;
}

export async function submitLeaveHrDecision(
  id: number | string,
  payload: LeaveDecisionDto
): Promise<LeaveRequestDto> {
  const res = await axiosInstance.post(endpoints.leaveRequests.hrDecision(id), payload);
  await revalidate(id, res.data.data);
  return res.data.data;
}

export async function cancelLeaveRequest(id: number | string): Promise<LeaveRequestDto> {
  const res = await axiosInstance.post(endpoints.leaveRequests.cancel(id));
  await revalidate(id, res.data.data);
  return res.data.data;
}

/** Approved leave that hasn't started: ask HR / Admin to cancel it. */
export async function requestLeaveCancellation(
  id: number | string,
  reason: string
): Promise<LeaveRequestDto> {
  const res = await axiosInstance.post(endpoints.leaveRequests.requestCancellation(id), { reason });
  await revalidate(id, res.data.data);
  return res.data.data;
}

/** HR / ADMIN: approve (leave cancelled) or reject (leave stays approved) a cancellation request. */
export async function decideLeaveCancellation(
  id: number | string,
  payload: { approved: boolean; remarks?: string }
): Promise<LeaveRequestDto> {
  const res = await axiosInstance.post(endpoints.leaveRequests.cancellationDecision(id), payload);
  await revalidate(id, res.data.data);
  return res.data.data;
}

export async function downloadLeaveRequestPdf(id: number | string): Promise<void> {
  const res = await axiosInstance.get(endpoints.leaveRequests.pdf(id), { responseType: 'blob' });
  downloadBlob(res.data, `leave-application-${id}.pdf`);
}
