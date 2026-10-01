import type { SWRConfiguration } from 'swr';
import type {
  ComplaintDto,
  ComplaintListMeta,
  CreateComplaintDto,
  ComplaintHrResponseDto,
} from 'src/types/complaint';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import { downloadBlob } from 'src/utils/download-blob';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — Complaint form data layer. Same template SWR pattern as src/actions/activity-logs.ts.

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

export type ComplaintScope = 'mine' | 'all';

export type ComplaintQuery = {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
};

type ComplaintListResponse = { data: ComplaintDto[]; meta: ComplaintListMeta };

const SCOPE_URL: Record<ComplaintScope, string> = {
  mine: endpoints.complaints.mine,
  all: endpoints.complaints.list,
};

/**
 * GET /complaints/mine (own) or /complaints (HR/ADMIN/CEO — everyone's). `enabled` skips the
 * fetch via SWR's conditional-key pattern so a role never calls an endpoint it isn't allowed to.
 */
export function useGetComplaints(scope: ComplaintScope, query: ComplaintQuery = {}, enabled = true) {
  const params = cleanParams(query);
  const key = enabled ? [SCOPE_URL[scope], { params }] : null;

  const { data, isLoading, error } = useSWR<ComplaintListResponse>(key, fetcher, swrOptions);

  return useMemo(
    () => ({
      complaints: data?.data || [],
      complaintsMeta: data?.meta,
      complaintsLoading: isLoading,
      complaintsError: error,
    }),
    [data?.data, data?.meta, error, isLoading]
  );
}

export function useGetComplaint(id?: number | string) {
  const url = id ? endpoints.complaints.details(id) : '';

  const { data, isLoading, error } = useSWR<{ data: ComplaintDto }>(url, fetcher, swrOptions);

  return useMemo(
    () => ({ complaint: data?.data, complaintLoading: isLoading, complaintError: error }),
    [data?.data, error, isLoading]
  );
}

// ----------------------------------------------------------------------

function revalidateComplaintLists() {
  const urls: string[] = Object.values(SCOPE_URL);
  return mutate((key) => Array.isArray(key) && urls.includes(key[0]));
}

/** POST /complaints — 400 if every section is empty. */
export async function createComplaint(payload: CreateComplaintDto): Promise<ComplaintDto> {
  const res = await axiosInstance.post(endpoints.complaints.list, payload);
  await revalidateComplaintLists();
  return res.data.data;
}

/** PATCH /complaints/:id/hr-response — HR/ADMIN only. */
export async function submitComplaintHrResponse(
  id: number | string,
  payload: ComplaintHrResponseDto
): Promise<ComplaintDto> {
  const res = await axiosInstance.patch(endpoints.complaints.hrResponse(id), payload);
  await mutate(endpoints.complaints.details(id), { data: res.data.data }, false);
  await revalidateComplaintLists();
  return res.data.data;
}

/** GET /complaints/:id/pdf — the filled-in form, laid out like the paper Complaint Form. */
export async function downloadComplaintPdf(id: number | string): Promise<void> {
  const res = await axiosInstance.get(endpoints.complaints.pdf(id), { responseType: 'blob' });
  downloadBlob(res.data, `complaint-form-${id}.pdf`);
}
