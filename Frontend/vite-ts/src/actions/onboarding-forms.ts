import type { SWRConfiguration } from 'swr';
import type {
  OnboardingFormDto,
  OnboardingHrRecordDto,
  OnboardingFormListMeta,
  SubmitOnboardingFormDto,
  MyOnboardingFormResponse,
} from 'src/types/onboarding-form';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import { downloadBlob } from 'src/utils/download-blob';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — Employee onboarding form data layer. Same template SWR pattern as
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

export type OnboardingFormQuery = { status?: string; q?: string; page?: number; limit?: number };

/** GET /onboarding-forms — HR / ADMIN / CEO. */
export function useGetOnboardingForms(query: OnboardingFormQuery = {}, enabled = true) {
  const key = enabled ? [endpoints.onboardingForms.list, { params: cleanParams(query) }] : null;

  const { data, isLoading, error } = useSWR<{
    data: OnboardingFormDto[];
    meta: OnboardingFormListMeta;
  }>(key, fetcher, swrOptions);

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

/** GET /onboarding-forms/mine — the caller's own form (or null) plus E-record pre-fill values. */
export function useGetMyOnboardingForm() {
  const { data, isLoading, error } = useSWR<MyOnboardingFormResponse>(
    endpoints.onboardingForms.mine,
    fetcher,
    swrOptions
  );

  return useMemo(
    () => ({
      myForm: data?.data ?? null,
      prefill: data?.prefill ?? {},
      myFormLoading: isLoading,
      myFormError: error,
    }),
    [data?.data, data?.prefill, error, isLoading]
  );
}

export function useGetOnboardingForm(id?: number | string) {
  const url = id ? endpoints.onboardingForms.details(id) : '';

  const { data, isLoading, error } = useSWR<{ data: OnboardingFormDto }>(url, fetcher, swrOptions);

  return useMemo(
    () => ({ form: data?.data, formLoading: isLoading, formError: error }),
    [data?.data, error, isLoading]
  );
}

// ----------------------------------------------------------------------

function revalidateLists() {
  return mutate((key) => Array.isArray(key) && key[0] === endpoints.onboardingForms.list);
}

/** PUT /onboarding-forms/mine — submit, or resubmit until HR records it. Also updates the E-record. */
export async function submitMyOnboardingForm(
  payload: SubmitOnboardingFormDto
): Promise<OnboardingFormDto> {
  const res = await axiosInstance.put(endpoints.onboardingForms.mine, payload);
  await mutate(endpoints.onboardingForms.mine);
  await revalidateLists();
  return res.data.data;
}

/** POST /onboarding-forms/:id/hr-record — HR / ADMIN; files the PDF into the E-record. */
export async function recordOnboardingForm(
  id: number | string,
  payload: OnboardingHrRecordDto
): Promise<OnboardingFormDto> {
  const res = await axiosInstance.post(endpoints.onboardingForms.hrRecord(id), payload);
  await mutate(endpoints.onboardingForms.details(id), { data: res.data.data }, false);
  await revalidateLists();
  return res.data.data;
}

/** GET /onboarding-forms/:id/pdf — the form laid out like the paper one. */
export async function downloadOnboardingFormPdf(id: number | string, name: string): Promise<void> {
  const res = await axiosInstance.get(endpoints.onboardingForms.pdf(id), { responseType: 'blob' });
  downloadBlob(res.data, `Onboarding Form - ${name}.pdf`);
}
