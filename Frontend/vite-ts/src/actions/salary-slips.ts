import type { SWRConfiguration } from 'swr';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import { downloadBlob } from 'src/utils/download-blob';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — salary slips. Mirrors Backend/src/salary-slips. HR / ADMIN generate and email them;
// everyone sees their own. Amounts are PKR.

export const SALARY_SLIP_MANAGER_ROLES = ['HR', 'ADMIN'];

export const SALARY_PAYMENT_METHODS = ['Bank transfer', 'Cheque', 'Cash'] as const;

export type SalarySlipEmailStatus = 'NOT_SENT' | 'SENT' | 'FAILED';

export type SalaryLineItem = { label: string; amount: number };

export interface SalarySlipDto {
  id: number;
  reference: string;
  employeeId: number;
  employeeName: string;
  employeeCode: string | null;
  designation: string | null;
  departmentName: string | null;
  salaryMonth: string;
  salaryMonthLabel: string;
  revision: number;
  isCurrent: boolean;
  basicSalary: number;
  allowances: SalaryLineItem[];
  bonus: number;
  overtime: number;
  deductions: SalaryLineItem[];
  tax: number;
  totalAllowances: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  paymentDate: string | null;
  paymentMethod: string | null;
  bankName: string | null;
  bankAccountNumberMasked: string | null;
  workingDays: number | null;
  notes: string | null;
  emailStatus: SalarySlipEmailStatus;
  emailedTo: string | null;
  emailSentAt: string | null;
  emailError: string | null;
  emailAttempts: number;
  lastEmailAttemptAt: string | null;
  generatedByName: string | null;
  supersededAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SalarySlipDefaults = {
  employee: {
    id: number;
    name: string;
    employeeCode: string | null;
    designation: string | null;
    departmentName: string | null;
    email: string;
    status: string;
    joinDate: string | null;
    bankName: string | null;
    bankAccountNumberMasked: string | null;
    currentSalary: number | null;
    deductionPolicy: string | null;
  };
  salaryMonth: string;
  daysInMonth: number;
  existing: SalarySlipDto | null;
  previous: SalarySlipDto | null;
};

export type CreateSalarySlipPayload = {
  employeeId: number;
  salaryMonth: string;
  basicSalary: number;
  allowances: SalaryLineItem[];
  bonus: number;
  overtime: number;
  deductions: SalaryLineItem[];
  tax: number;
  paymentDate?: string;
  paymentMethod?: string;
  workingDays?: number;
  notes?: string;
  regenerate?: boolean;
};

export type SalarySlipScope = 'all' | 'mine';

export type SalarySlipQuery = {
  employeeId?: number;
  salaryMonth?: string;
  emailStatus?: SalarySlipEmailStatus;
  q?: string;
  includeSuperseded?: boolean;
  page?: number;
  limit?: number;
};

export const EMAIL_STATUS_LABEL: Record<SalarySlipEmailStatus, string> = {
  NOT_SENT: 'Not sent',
  SENT: 'Sent',
  FAILED: 'Failed',
};

/** 'Rs 125,000.00' — same format as the PDF. */
export function fSalary(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return `Rs ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** '2026-09' → 'September 2026'. */
export function fSalaryMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  if (!year || !m) return month;
  return new Date(year, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/** This month as 'YYYY-MM'. */
export function currentSalaryMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Last month as 'YYYY-MM' — the usual month to generate slips for. */
export function previousSalaryMonth(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Same rule as the backend (in paisa, so no float drift):
 * Gross = Basic + Allowances + Bonus + Overtime; Net = Gross − (Deductions + Tax).
 */
export function calculateSalary(input: {
  basicSalary: number;
  allowances: SalaryLineItem[];
  bonus: number;
  overtime: number;
  deductions: SalaryLineItem[];
  tax: number;
}) {
  const p = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 100);
  const allowances = input.allowances.reduce((sum, item) => sum + p(item.amount), 0);
  const gross = p(input.basicSalary) + allowances + p(input.bonus) + p(input.overtime);
  const deductions = input.deductions.reduce((sum, item) => sum + p(item.amount), 0) + p(input.tax);
  return {
    totalAllowances: allowances / 100,
    grossSalary: gross / 100,
    totalDeductions: deductions / 100,
    netSalary: (gross - deductions) / 100,
  };
}

const swrOptions: SWRConfiguration = {
  revalidateIfStale: true,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

const SCOPE_URL: Record<SalarySlipScope, string> = {
  all: endpoints.salarySlips.list,
  mine: endpoints.salarySlips.mine,
};

const revalidateSalarySlips = () =>
  mutate((key) => {
    const url = Array.isArray(key) ? key[0] : key;
    return typeof url === 'string' && url.startsWith('/salary-slips');
  });

// ----------------------------------------------------------------------

export function useGetSalarySlips(
  scope: SalarySlipScope,
  query: SalarySlipQuery = {},
  enabled = true
) {
  const params = Object.fromEntries(
    Object.entries(query).filter(
      ([, value]) => value !== undefined && value !== '' && value !== false
    )
  );
  const { data, isLoading, error } = useSWR<{
    data: SalarySlipDto[];
    meta: { total: number; page: number; limit: number };
  }>(enabled ? [SCOPE_URL[scope], { params }] : null, fetcher, swrOptions);
  return useMemo(
    () => ({
      salarySlips: data?.data || [],
      salarySlipsMeta: data?.meta,
      salarySlipsLoading: isLoading,
      salarySlipsError: error as Error | undefined,
    }),
    [data?.data, data?.meta, isLoading, error]
  );
}

export function useGetSalarySlipDefaults(employeeId?: number | null, salaryMonth?: string) {
  const { data, isLoading, error, isValidating } = useSWR<{ data: SalarySlipDefaults }>(
    employeeId && salaryMonth
      ? [endpoints.salarySlips.defaults, { params: { employeeId, salaryMonth } }]
      : null,
    fetcher,
    { ...swrOptions, revalidateIfStale: false }
  );
  return useMemo(
    () => ({
      defaults: data?.data,
      defaultsLoading: isLoading || isValidating,
      defaultsError: error as Error | undefined,
    }),
    [data?.data, isLoading, isValidating, error]
  );
}

export async function createSalarySlip(payload: CreateSalarySlipPayload): Promise<SalarySlipDto> {
  const res = await axiosInstance.post(endpoints.salarySlips.list, payload);
  await revalidateSalarySlips();
  return res.data.data;
}

/** Emails the PDF to the employee's registered address (also used for Resend). */
export async function sendSalarySlip(id: number): Promise<SalarySlipDto> {
  try {
    const res = await axiosInstance.post(endpoints.salarySlips.send(id));
    return res.data.data;
  } finally {
    // A failed send is saved as FAILED on the server — refresh either way.
    await revalidateSalarySlips();
  }
}

export async function fetchSalarySlipPdf(id: number): Promise<Blob> {
  const res = await axiosInstance.get(endpoints.salarySlips.pdf(id), { responseType: 'blob' });
  return new Blob([res.data], { type: 'application/pdf' });
}

export function salarySlipFilename(
  slip: Pick<SalarySlipDto, 'salaryMonth' | 'employeeName' | 'revision'>
) {
  const name = slip.employeeName.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `Salary-Slip-${slip.salaryMonth}-${name}${slip.revision > 1 ? `-R${slip.revision}` : ''}.pdf`;
}

export async function downloadSalarySlipPdf(slip: SalarySlipDto): Promise<void> {
  downloadBlob(await fetchSalarySlipPdf(slip.id), salarySlipFilename(slip));
}

/** Prints the PDF via a hidden iframe (the file needs the auth header, so it's fetched as a blob). */
export async function printSalarySlipPdf(id: number): Promise<void> {
  const url = window.URL.createObjectURL(await fetchSalarySlipPdf(id));
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.src = url;
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      // Some browsers block printing a PDF from a frame — open it so the user can print there.
      window.open(url, '_blank', 'noopener');
    }
  };
  document.body.appendChild(frame);
  setTimeout(() => {
    frame.remove();
    window.URL.revokeObjectURL(url);
  }, 120_000);
}
