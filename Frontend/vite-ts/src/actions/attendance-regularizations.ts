import type { SWRConfiguration } from 'swr';
import type {
  HodRecommendationDto,
  AttendanceHrDecisionDto,
  AttendanceRegularizationDto,
  AttendanceRegularizationListMeta,
  CreateAttendanceRegularizationDto,
} from 'src/types/attendance-regularization';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import { downloadBlob } from 'src/utils/download-blob';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — Attendance regularization data layer. Same template SWR pattern as
// src/actions/complaints.ts.

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

export type AttendanceRegularizationScope = 'mine' | 'team' | 'all';

export type AttendanceRegularizationQuery = {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
};

type ListResponse = {
  data: AttendanceRegularizationDto[];
  meta: AttendanceRegularizationListMeta;
};

const SCOPE_URL: Record<AttendanceRegularizationScope, string> = {
  mine: endpoints.attendanceRegularizations.mine,
  team: endpoints.attendanceRegularizations.team,
  all: endpoints.attendanceRegularizations.list,
};

/**
 * GET /attendance-regularizations/mine (own), /team (where the caller is the HOD) or
 * /attendance-regularizations (HR/ADMIN/CEO). `enabled` skips the fetch via SWR's conditional key.
 */
export function useGetAttendanceRegularizations(
  scope: AttendanceRegularizationScope,
  query: AttendanceRegularizationQuery = {},
  enabled = true
) {
  const params = cleanParams(query);
  const key = enabled ? [SCOPE_URL[scope], { params }] : null;

  const { data, isLoading, error } = useSWR<ListResponse>(key, fetcher, swrOptions);

  return useMemo(
    () => ({
      forms: data?.data || [],
      formsMeta: data?.meta,
      formsLoading: isLoading,
      formsError: error,
    }),
    [data?.data, data?.meta, error, isLoading]
  );
}

export function useGetAttendanceRegularization(id?: number | string) {
  const url = id ? endpoints.attendanceRegularizations.details(id) : '';

  const { data, isLoading, error } = useSWR<{ data: AttendanceRegularizationDto }>(
    url,
    fetcher,
    swrOptions
  );

  return useMemo(
    () => ({ form: data?.data, formLoading: isLoading, formError: error }),
    [data?.data, error, isLoading]
  );
}

// ----------------------------------------------------------------------

async function revalidate(id?: number | string, updated?: AttendanceRegularizationDto) {
  if (id && updated) {
    await mutate(endpoints.attendanceRegularizations.details(id), { data: updated }, false);
  }
  const urls: string[] = Object.values(SCOPE_URL);
  await mutate((key) => Array.isArray(key) && urls.includes(key[0]));
}

/** POST /attendance-regularizations — 400 for a future date or no times at all. */
export async function createAttendanceRegularization(
  payload: CreateAttendanceRegularizationDto
): Promise<AttendanceRegularizationDto> {
  const res = await axiosInstance.post(endpoints.attendanceRegularizations.list, payload);
  await revalidate();
  return res.data.data;
}

/** POST /attendance-regularizations/:id/hod-recommendation — the employee's HOD only. */
export async function submitHodRecommendation(
  id: number | string,
  payload: HodRecommendationDto
): Promise<AttendanceRegularizationDto> {
  const res = await axiosInstance.post(
    endpoints.attendanceRegularizations.hodRecommendation(id),
    payload
  );
  await revalidate(id, res.data.data);
  return res.data.data;
}

/** POST /attendance-regularizations/:id/hr-decision — HR / ADMIN. */
export async function submitAttendanceHrDecision(
  id: number | string,
  payload: AttendanceHrDecisionDto
): Promise<AttendanceRegularizationDto> {
  const res = await axiosInstance.post(endpoints.attendanceRegularizations.hrDecision(id), payload);
  await revalidate(id, res.data.data);
  return res.data.data;
}

/** GET /attendance-regularizations/:id/pdf — the filled-in form, laid out like the paper one. */
export async function downloadAttendanceRegularizationPdf(id: number | string): Promise<void> {
  const res = await axiosInstance.get(endpoints.attendanceRegularizations.pdf(id), {
    responseType: 'blob',
  });
  downloadBlob(res.data, `attendance-regularization-${id}.pdf`);
}
