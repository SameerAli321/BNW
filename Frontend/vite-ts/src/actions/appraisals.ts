import type { SWRConfiguration } from 'swr';
import type {
  CeoDecisionDto,
  IAppraisalListMeta,
  ManagerDecisionDto,
  AppraisalRequestDto,
  MyAppraisalsResponseDto,
  CreateAppraisalRequestDto,
} from 'src/types/appraisal';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — Sprint 4 data layer (Appraisals), wired to the real backend per
// docs/API_CONTRACT_SPRINT4.md. Same template SWR pattern as src/actions/letters.ts — no new
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

// ----------------------------------------------------------------------
// Lists

/** GET /appraisal-requests/mine — self. Own appraisal history + `canRequestNext`/`nextEligibleDate`. */
export function useGetMyAppraisals() {
  const { data, isLoading, error, isValidating } = useSWR<MyAppraisalsResponseDto>(
    endpoints.appraisalRequests.mine,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      appraisals: data?.data || [],
      appraisalsMeta: data?.meta,
      appraisalsLoading: isLoading,
      appraisalsError: error,
      appraisalsValidating: isValidating,
    }),
    [data?.data, data?.meta, error, isLoading, isValidating]
  );

  return memoizedValue;
}

export type TeamAppraisalsFilters = { status?: string };

/**
 * GET /appraisal-requests/team — MANAGER (and HR/ADMIN as a courtesy per the contract's
 * ownership note). `enabled` lets the caller skip the fetch entirely (e.g. a tab that isn't
 * currently selected, or a role that shouldn't be hitting this endpoint) via SWR's
 * conditional-key pattern (null key = don't fetch).
 */
export function useGetTeamAppraisals(filters: TeamAppraisalsFilters = {}, enabled = true) {
  const params = cleanParams(filters);
  const key = enabled ? [endpoints.appraisalRequests.team, { params }] : null;

  const { data, isLoading, error, isValidating } = useSWR<{ data: AppraisalRequestDto[] }>(
    key,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      appraisals: data?.data || [],
      appraisalsLoading: isLoading,
      appraisalsError: error,
      appraisalsValidating: isValidating,
    }),
    [data?.data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

/** GET /appraisal-requests/pending-ceo — CEO only. `status = PENDING_CEO`. */
export function useGetPendingCeoAppraisals(enabled = true) {
  const key = enabled ? endpoints.appraisalRequests.pendingCeo : null;

  const { data, isLoading, error, isValidating } = useSWR<{ data: AppraisalRequestDto[] }>(
    key,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      appraisals: data?.data || [],
      appraisalsLoading: isLoading,
      appraisalsError: error,
      appraisalsValidating: isValidating,
    }),
    [data?.data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

export type AllAppraisalsFilters = {
  status?: string;
  employeeId?: number | string;
  page?: number;
  limit?: number;
};

type AllAppraisalsResponse = { data: AppraisalRequestDto[]; meta: IAppraisalListMeta };

/** GET /appraisal-requests — HR, ADMIN. All requests, paginated. */
export function useGetAllAppraisals(filters: AllAppraisalsFilters = {}, enabled = true) {
  const params = cleanParams(filters);
  const key = enabled ? [endpoints.appraisalRequests.list, { params }] : null;

  const { data, isLoading, error, isValidating } = useSWR<AllAppraisalsResponse>(
    key,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      appraisals: data?.data || [],
      appraisalsMeta: data?.meta,
      appraisalsLoading: isLoading,
      appraisalsError: error,
      appraisalsValidating: isValidating,
    }),
    [data?.data, data?.meta, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------
// Detail + mutations

function revalidateAppraisalLists() {
  return mutate((key) => {
    if (typeof key === 'string') {
      return (
        key === endpoints.appraisalRequests.mine ||
        key === endpoints.appraisalRequests.team ||
        key === endpoints.appraisalRequests.pendingCeo ||
        key === endpoints.appraisalRequests.list
      );
    }
    if (Array.isArray(key) && typeof key[0] === 'string') {
      return (
        key[0] === endpoints.appraisalRequests.team ||
        key[0] === endpoints.appraisalRequests.pendingCeo ||
        key[0] === endpoints.appraisalRequests.list
      );
    }
    return false;
  });
}

function revalidateAppraisal(id: number | string) {
  return mutate(endpoints.appraisalRequests.details(id));
}

async function revalidateAfterAction(id: number | string) {
  await Promise.all([revalidateAppraisal(id), revalidateAppraisalLists()]);
}

/**
 * GET /appraisal-requests/:id — HR, ADMIN, CEO, the request's employee, the request's
 * `managerId`. Includes `events`.
 */
export function useGetAppraisal(id?: number | string) {
  const url = id ? endpoints.appraisalRequests.details(id) : '';

  const { data, isLoading, error, isValidating } = useSWR<{ data: AppraisalRequestDto }>(
    url,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      appraisal: data?.data,
      appraisalLoading: isLoading,
      appraisalError: error,
      appraisalValidating: isValidating,
    }),
    [data?.data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

/**
 * POST /appraisal-requests — self (anyone with a manager set). `{ selfEvaluation }`. 409 if
 * already requested one in the last 3 months; 400 if the caller has no manager set — the axios
 * response interceptor collapses either into a plain `Error(message)`, surfaced by the caller.
 */
export async function createAppraisalRequest(
  payload: CreateAppraisalRequestDto
): Promise<AppraisalRequestDto> {
  const res = await axiosInstance.post(endpoints.appraisalRequests.list, payload);
  await revalidateAppraisalLists();
  return res.data.data;
}

/**
 * POST /appraisal-requests/:id/manager-decision — the request's `managerId` only. Only valid
 * while `status = PENDING_MANAGER`.
 */
export async function submitManagerDecision(
  id: number | string,
  payload: ManagerDecisionDto
): Promise<void> {
  await axiosInstance.post(endpoints.appraisalRequests.managerDecision(id), payload);
  await revalidateAfterAction(id);
}

/**
 * POST /appraisal-requests/:id/ceo-decision — CEO only. Only valid while `status = PENDING_CEO`.
 * `SEND_BACK` resets status to `PENDING_MANAGER` (see the contract's status-machine note).
 */
export async function submitCeoDecision(
  id: number | string,
  payload: CeoDecisionDto
): Promise<void> {
  await axiosInstance.post(endpoints.appraisalRequests.ceoDecision(id), payload);
  await revalidateAfterAction(id);
}
