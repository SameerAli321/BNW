import type { SWRConfiguration } from 'swr';
import type {
  CandidateDto,
  UpdateCandidateDto,
  ICandidateListMeta,
  ConvertCandidateDto,
  ConvertCandidateResponse,
} from 'src/types/candidate';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import { downloadBlob } from 'src/utils/download-blob';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — Sprint 5 data layer (Hiring: candidates), wired to the real backend per
// docs/API_CONTRACT_SPRINT5.md. Same template SWR pattern as src/actions/appraisals.ts — no new
// data-fetching library introduced.

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

export type CandidatesListFilters = {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
};

type CandidatesListResponse = { data: CandidateDto[]; meta: ICandidateListMeta };

/** GET /candidates — HR, ADMIN. `?status=&q=&page=&limit=`. */
export function useGetCandidates(filters: CandidatesListFilters = {}) {
  const params = cleanParams(filters);

  const { data, isLoading, error, isValidating } = useSWR<CandidatesListResponse>(
    [endpoints.candidates.list, { params }],
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      candidates: data?.data || [],
      candidatesMeta: data?.meta,
      candidatesLoading: isLoading,
      candidatesError: error,
      candidatesValidating: isValidating,
    }),
    [data?.data, data?.meta, error, isLoading, isValidating]
  );

  return memoizedValue;
}

function revalidateCandidatesList() {
  return mutate((key) => Array.isArray(key) && key[0] === endpoints.candidates.list);
}

/** GET /candidates/:id — HR, ADMIN. */
export function useGetCandidate(id?: number | string) {
  const url = id ? endpoints.candidates.details(id) : '';

  const { data, isLoading, error, isValidating } = useSWR<{ data: CandidateDto }>(
    url,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      candidate: data?.data,
      candidateLoading: isLoading,
      candidateError: error,
      candidateValidating: isValidating,
    }),
    [data?.data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

/**
 * POST /candidates/bulk-upload — HR, ADMIN. Multipart, field `files` (multiple, PDF only). One
 * `Candidate` row per file, `status = NEW`. Returns the created candidates.
 */
export async function bulkUploadCandidateCvs(files: File[]): Promise<CandidateDto[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const res = await axiosInstance.post(endpoints.candidates.bulkUpload, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  await revalidateCandidatesList();
  return res.data.data;
}

/**
 * PATCH /candidates/:id — HR, ADMIN. 409 if trying to set `status` on an already-`HIRED`
 * candidate (that transition only happens via `/convert`) — the axios response interceptor
 * collapses the error into a plain `Error(message)`, surfaced by the caller.
 */
export async function updateCandidate(
  id: number | string,
  payload: UpdateCandidateDto
): Promise<CandidateDto> {
  const res = await axiosInstance.patch(endpoints.candidates.details(id), payload);
  await Promise.all([revalidateCandidatesList(), mutate(endpoints.candidates.details(id))]);
  return res.data.data;
}

/**
 * GET /candidates/:id/cv — HR, ADMIN. Streams the file, so this fetches as a blob and triggers a
 * browser download rather than a JSON fetch — same pattern as `downloadDocument` in
 * src/actions/employee-records.ts.
 */
export async function downloadCandidateCv(
  id: number | string,
  filename: string
): Promise<void> {
  const res = await axiosInstance.get(endpoints.candidates.cv(id), { responseType: 'blob' });
  downloadBlob(res.data, filename);
}

/**
 * POST /candidates/:id/convert — HR, ADMIN. Body is `ConvertCandidateDto` (same shape as
 * `CreateUserDto` minus `email`/`firstName`/`lastName`, defaulted from the candidate). 409 if
 * `candidate.status === 'HIRED'` already, or the email collides with an existing user. On
 * success: creates the `User`, sets `candidate.status = 'HIRED'` + `convertedUserId`. Returns
 * `{ candidate, user }`.
 */
export async function convertCandidate(
  id: number | string,
  payload: ConvertCandidateDto
): Promise<ConvertCandidateResponse> {
  const res = await axiosInstance.post(endpoints.candidates.convert(id), payload);
  await Promise.all([revalidateCandidatesList(), mutate(endpoints.candidates.details(id))]);
  return res.data.data;
}
