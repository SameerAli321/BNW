import type { SWRConfiguration } from 'swr';
import type {
  LetterDto,
  IListMeta,
  CreateLetterDto,
  UpdateLetterDto,
  LetterTemplateDto,
  LetterFieldSchemaEntry,
  CreateLetterTemplateDto,
  UpdateLetterTemplateDto,
} from 'src/types/letter';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import { downloadBlob } from 'src/utils/download-blob';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — Sprint 3 data layer (Letter engine), wired to the real backend per
// docs/API_CONTRACT_SPRINT3.md. Same template SWR pattern as src/actions/users.ts /
// src/actions/employee-records.ts — no new data-fetching library introduced.

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
// Letter templates

export type LetterTemplatesFilters = {
  type?: string;
  isActive?: boolean;
};

/** GET /letter-templates — HR, CEO, ADMIN. */
export function useGetLetterTemplates(filters: LetterTemplatesFilters = {}) {
  const params = cleanParams(filters);

  const { data, isLoading, error, isValidating } = useSWR<{ data: LetterTemplateDto[] }>(
    [endpoints.letterTemplates.list, { params }],
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      templates: data?.data || [],
      templatesLoading: isLoading,
      templatesError: error,
      templatesValidating: isValidating,
    }),
    [data?.data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

function revalidateLetterTemplatesList() {
  return mutate((key) => Array.isArray(key) && key[0] === endpoints.letterTemplates.list);
}

/** GET /letter-templates/:id — HR, CEO, ADMIN. */
export function useGetLetterTemplate(id?: number | string) {
  const url = id ? endpoints.letterTemplates.details(id) : '';

  const { data, isLoading, error } = useSWR<{ data: LetterTemplateDto }>(url, fetcher, swrOptions);

  return {
    template: data?.data,
    templateLoading: isLoading,
    templateError: error,
  };
}

/**
 * GET /letter-templates/:id/fields — HR, CEO, ADMIN. Used to build the manual-fields form when
 * creating a letter from this template.
 */
export function useGetLetterTemplateFields(id?: number | string) {
  const url = id ? endpoints.letterTemplates.fields(id) : '';

  const { data, isLoading, error } = useSWR<{ data: LetterFieldSchemaEntry[] }>(
    url,
    fetcher,
    swrOptions
  );

  return {
    fieldsSchema: data?.data || [],
    fieldsLoading: isLoading,
    fieldsError: error,
  };
}

/** POST /letter-templates — ADMIN only. */
export async function createLetterTemplate(
  payload: CreateLetterTemplateDto
): Promise<LetterTemplateDto> {
  const res = await axiosInstance.post(endpoints.letterTemplates.list, payload);
  await revalidateLetterTemplatesList();
  return res.data.data;
}

/** PUT /letter-templates/:id — ADMIN only, full update. */
export async function updateLetterTemplate(
  id: number | string,
  payload: UpdateLetterTemplateDto
): Promise<LetterTemplateDto> {
  const res = await axiosInstance.put(endpoints.letterTemplates.details(id), payload);
  await Promise.all([
    revalidateLetterTemplatesList(),
    mutate(endpoints.letterTemplates.details(id)),
  ]);
  return res.data.data;
}

// ----------------------------------------------------------------------
// Letters

export type LettersListFilters = {
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
};

type LettersListResponse = { data: LetterDto[]; meta: IListMeta };

/**
 * GET /letters — HR, CEO, ADMIN see all letters (optionally filtered); any other authenticated
 * caller only ever sees letters where they're the subject (server-side filter, not a query param
 * — see the contract). This is how an employee sees their own pending/past letters.
 */
export function useGetLetters(filters: LettersListFilters = {}) {
  const params = cleanParams(filters);

  const { data, isLoading, error, isValidating } = useSWR<LettersListResponse>(
    [endpoints.letters.list, { params }],
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      letters: data?.data || [],
      lettersMeta: data?.meta,
      lettersLoading: isLoading,
      lettersError: error,
      lettersValidating: isValidating,
      lettersEmpty: !isLoading && !data?.data.length,
    }),
    [data?.data, data?.meta, error, isLoading, isValidating]
  );

  return memoizedValue;
}

function revalidateLettersList() {
  return mutate((key) => Array.isArray(key) && key[0] === endpoints.letters.list);
}

function revalidateLetter(id: number | string) {
  return mutate(endpoints.letters.details(id));
}

async function revalidateAfterAction(id: number | string) {
  await Promise.all([revalidateLetter(id), revalidateLettersList()]);
}

/** GET /letters/:id — HR, CEO, ADMIN, self (if subject). Includes `events`/`signatures`. */
export function useGetLetter(id?: number | string) {
  const url = id ? endpoints.letters.details(id) : '';

  const { data, isLoading, error, isValidating } = useSWR<{ data: LetterDto }>(
    url,
    fetcher,
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      letter: data?.data,
      letterLoading: isLoading,
      letterError: error,
      letterValidating: isValidating,
    }),
    [data?.data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

/** POST /letters — HR/ADMIN only. Creates in DRAFT. */
export async function createLetter(payload: CreateLetterDto): Promise<LetterDto> {
  const res = await axiosInstance.post(endpoints.letters.list, payload);
  await revalidateLettersList();
  return res.data.data;
}

/** PATCH /letters/:id — HR/ADMIN only, while DRAFT or CHANGES_REQUESTED. */
export async function updateLetter(
  id: number | string,
  payload: UpdateLetterDto
): Promise<LetterDto> {
  const res = await axiosInstance.patch(endpoints.letters.details(id), payload);
  await revalidateAfterAction(id);
  return res.data.data;
}

/**
 * POST /letters/:id/preview — HR/ADMIN only. (Re-)renders the PDF from current `fieldValues`
 * without changing status. Returns `{ data: { pdfUrl } }` per the contract; the letter is
 * revalidated afterwards so `hasPdf` flips to true on first preview.
 */
export async function previewLetter(id: number | string): Promise<{ pdfUrl: string }> {
  const res = await axiosInstance.post(endpoints.letters.preview(id));
  await revalidateLetter(id);
  return res.data.data;
}

/** POST /letters/:id/submit-to-ceo — HR/ADMIN only. DRAFT|CHANGES_REQUESTED -> PENDING_CEO. */
export async function submitLetterToCeo(id: number | string): Promise<void> {
  await axiosInstance.post(endpoints.letters.submitToCeo(id));
  await revalidateAfterAction(id);
}

/** POST /letters/:id/request-changes — CEO only. `{ comment }` required. PENDING_CEO -> CHANGES_REQUESTED. */
export async function requestLetterChanges(
  id: number | string,
  comment: string
): Promise<void> {
  await axiosInstance.post(endpoints.letters.requestChanges(id), { comment });
  await revalidateAfterAction(id);
}

/** POST /letters/:id/ceo-sign — CEO only. `{ signatureText }`. PENDING_CEO -> CEO_SIGNED. */
export async function ceoSignLetter(id: number | string, signatureText: string): Promise<void> {
  await axiosInstance.post(endpoints.letters.ceoSign(id), { signatureText });
  await revalidateAfterAction(id);
}

/**
 * POST /letters/:id/send-to-employee — HR/ADMIN only. CEO_SIGNED -> SENT_TO_EMPLOYEE. `message` is
 * an optional note shown to the employee on the letter's timeline.
 */
export async function sendLetterToEmployee(
  id: number | string,
  message?: string
): Promise<void> {
  await axiosInstance.post(endpoints.letters.sendToEmployee(id), { message });
  await revalidateAfterAction(id);
}

/**
 * POST /letters/:id/employee-sign — self only (subjectUserId === caller.id). `{ signatureText }`.
 * SENT_TO_EMPLOYEE -> SIGNED. Also revalidates the subject's E-record (Sprint 2), since the signed
 * PDF is auto-filed there per the contract's U5 integration.
 */
export async function employeeSignLetter(
  id: number | string,
  signatureText: string,
  subjectUserId?: number | string
): Promise<void> {
  await axiosInstance.post(endpoints.letters.employeeSign(id), { signatureText });
  await revalidateAfterAction(id);
  if (subjectUserId) {
    await mutate(endpoints.employees.record(subjectUserId));
  }
}

/**
 * GET /letters/:id/pdf — HR, CEO, ADMIN, self (if subject). Streams the current rendered PDF, so
 * this fetches as a blob and triggers a browser download rather than a JSON fetch. 404s if never
 * rendered (call `previewLetter` first).
 */
export async function downloadLetterPdf(
  id: number | string,
  filename: string
): Promise<void> {
  const res = await axiosInstance.get(endpoints.letters.pdf(id), { responseType: 'blob' });
  downloadBlob(res.data, filename);
}
