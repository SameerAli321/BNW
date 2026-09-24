import type { SWRConfiguration } from 'swr';
import type {
  DocumentTypeDto,
  EmployeeRecordDto,
  StaffSummaryRowDto,
  IStaffSummaryListMeta,
} from 'src/types/employee-record';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import { downloadBlob } from 'src/utils/download-blob';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — Sprint 2 data layer (E-record & Staff summary), wired to the real backend per
// docs/API_CONTRACT_SPRINT2.md. Same template SWR pattern as src/actions/users.ts (Sprint 1) —
// no new data-fetching library introduced.

const swrOptions: SWRConfiguration = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------
// Staff summary

export type StaffSummaryFilters = {
  q?: string;
  departmentId?: number;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
};

type StaffSummaryResponse = { data: StaffSummaryRowDto[]; meta: IStaffSummaryListMeta };

function staffSummaryParams(filters: StaffSummaryFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')
  );
}

/** GET /staff-summary — HR/CEO/ADMIN only. */
export function useGetStaffSummary(filters: StaffSummaryFilters = {}) {
  const params = staffSummaryParams(filters);

  const { data, isLoading, error, isValidating } = useSWR<StaffSummaryResponse>(
    [endpoints.staffSummary.list, { params }],
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      rows: data?.data || [],
      rowsMeta: data?.meta,
      rowsLoading: isLoading,
      rowsError: error,
      rowsValidating: isValidating,
      rowsEmpty: !isLoading && !data?.data.length,
    }),
    [data?.data, data?.meta, error, isLoading, isValidating]
  );

  return memoizedValue;
}

/**
 * GET /staff-summary/export — HR/CEO/ADMIN only. Returns a CSV file (not JSON), so this fetches
 * as a blob and triggers a browser download rather than going through the SWR `fetcher`.
 */
export async function exportStaffSummaryCsv(filters: StaffSummaryFilters = {}): Promise<void> {
  // Export is unpaginated per the contract — drop page/limit even if the caller passed them.
  const exportFilters: StaffSummaryFilters = { ...filters };
  delete exportFilters.page;
  delete exportFilters.limit;
  const params = staffSummaryParams(exportFilters);

  const res = await axiosInstance.get(endpoints.staffSummary.export, {
    params,
    responseType: 'blob',
  });

  downloadBlob(res.data, 'staff-summary.csv');
}

// ----------------------------------------------------------------------
// Document types

/** GET /document-types — any authenticated user. */
export function useGetDocumentTypes() {
  const { data, isLoading, error } = useSWR<{ data: DocumentTypeDto[] }>(
    endpoints.documentTypes,
    fetcher,
    swrOptions
  );

  return {
    documentTypes: data?.data || [],
    documentTypesLoading: isLoading,
    documentTypesError: error,
  };
}

// ----------------------------------------------------------------------
// Employee E-record

/** GET /employees/:id/record — HR, ADMIN, CEO, self, manager-of. */
export function useGetEmployeeRecord(userId?: number | string) {
  const url = userId ? endpoints.employees.record(userId) : '';

  const { data, isLoading, error, isValidating } = useSWR<{ data: EmployeeRecordDto }>(
    url,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      record: data?.data,
      recordLoading: isLoading,
      recordError: error,
      recordValidating: isValidating,
    }),
    [data?.data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

function revalidateEmployeeRecord(userId: number | string) {
  return mutate(endpoints.employees.record(userId));
}

/** POST /employees/:id/documents — HR/ADMIN only. `multipart/form-data`: `file` + `documentTypeId`. */
export async function uploadEmployeeDocument(
  userId: number | string,
  payload: { file: File; documentTypeId: number }
): Promise<void> {
  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('documentTypeId', String(payload.documentTypeId));

  await axiosInstance.post(endpoints.employees.documents(userId), formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  await revalidateEmployeeRecord(userId);
}

/** POST /employees/:id/document-requests — HR/ADMIN only. */
export async function createDocumentRequest(
  userId: number | string,
  payload: { documentTypeId: number; dueDate?: string | null }
): Promise<void> {
  await axiosInstance.post(endpoints.employees.documentRequests(userId), payload);
  await revalidateEmployeeRecord(userId);
}

/**
 * GET /documents/:id/download — HR, ADMIN, CEO, self (own document), manager-of. Streams the
 * file, so this fetches as a blob and triggers a browser download rather than a JSON fetch.
 */
export async function downloadDocument(
  documentId: number | string,
  filename: string
): Promise<void> {
  const res = await axiosInstance.get(endpoints.documents.download(documentId), {
    responseType: 'blob',
  });

  downloadBlob(res.data, filename);
}
