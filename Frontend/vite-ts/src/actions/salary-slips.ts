import type { SWRConfiguration } from 'swr';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import { downloadBlob } from 'src/utils/download-blob';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — salary slips. Mirrors Backend/src/salary-slips. HR / ADMIN generate and email them;
// everyone sees their own. Amounts are PKR.

export const SALARY_SLIP_MANAGER_ROLES = ['HR', 'ADMIN'];

/** Who can open the payroll sheet: managers plus the accountant (PAYROLL role). */
export const PAYROLL_SHEET_ROLES = [...SALARY_SLIP_MANAGER_ROLES, 'PAYROLL'];

export type SecurityDeductionMode = 'NONE' | 'PERCENT_5' | 'PERCENT_10' | 'MANUAL';

export const SECURITY_DEDUCTION_OPTIONS: { value: SecurityDeductionMode; label: string }[] = [
  { value: 'NONE', label: 'None' },
  { value: 'PERCENT_5', label: '5% of gross' },
  { value: 'PERCENT_10', label: '10% of gross' },
  { value: 'MANUAL', label: 'Manual amount' },
];

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
  /** Shown as "Gross salary" in the UI (the field name is unchanged). */
  basicSalary: number;
  allowances: SalaryLineItem[];
  bonus: number;
  overtime: number;
  deductions: SalaryLineItem[];
  tax: number;
  /** LEGACY = allowances / bonus / overtime; PAYROLL = the payroll sheet formula. */
  scheme: 'LEGACY' | 'PAYROLL';
  nationalId: string | null;
  unpaidDays: number;
  perDaySalary: number | null;
  unpaidDeduction: number;
  securityMode: SecurityDeductionMode | null;
  securityDeduction: number;
  loanDeduction: number;
  loanId: number | null;
  loanInstalmentNo: number | null;
  loanInstalments: number | null;
  loanBalanceAfter: number | null;
  nonTaxableAddition: number;
  taxableAddition: number;
  taxableSalary: number | null;
  totalAllowances: number;
  /** Shown as "Total earnings" in the UI. */
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
    nationalId: string | null;
    currentSalary: number | null;
    deductionPolicy: string | null;
  };
  salaryMonth: string;
  daysInMonth: number;
  /** The sheet's working days for the month. */
  workingDays: number;
  /** This month's payroll sheet row — saved, or the starting values. */
  payroll: PayrollEntryInputs & { saved: boolean };
  /** The loan instalment due this month, if any. */
  loan: LoanInstalment | null;
  existing: SalarySlipDto | null;
  previous: SalarySlipDto | null;
};

export type CreateSalarySlipPayload = {
  employeeId: number;
  salaryMonth: string;
  /** Gross salary. */
  basicSalary: number;
  workingDays: number;
  unpaidDays: number;
  securityMode: SecurityDeductionMode;
  securityAmount?: number;
  // No tax: the accountant enters it on the payroll sheet and the slip takes it from there.
  /** Leave out to take the scheduled loan instalment. */
  loanDeduction?: number;
  nonTaxableAddition: number;
  taxableAddition: number;
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
  regenerate?: boolean;
};

// ---- Payroll sheet ----------------------------------------------------

export type PayrollEntryInputs = {
  grossSalary: number;
  workingDays: number;
  unpaidDays: number;
  securityMode: SecurityDeductionMode;
  securityAmount: number;
  tax: number;
  /** Null = the loan schedule's instalment. */
  loanOverride: number | null;
  nonTaxableAddition: number;
  taxableAddition: number;
  paid: number;
};

export type LoanInstalment = {
  loanId: number;
  principal: number;
  instalments: number;
  instalmentNo: number;
  recoveredBefore: number;
  remainingBefore: number;
  amount: number;
};

export type PayrollTotals = {
  perDaySalary: number;
  unpaidDeduction: number;
  securityDeduction: number;
  taxableSalary: number;
  totalAdditions: number;
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  balance: number;
};

export type PayrollRow = {
  employeeId: number;
  employeeName: string;
  staffId: string | null;
  designation: string | null;
  departmentName: string | null;
  nationalId: string | null;
  bankName: string | null;
  bankAccountNumberMasked: string | null;
  employeeStatus: 'ACTIVE' | 'INACTIVE';
  saved: boolean;
  inputs: PayrollEntryInputs;
  loan: LoanInstalment | null;
  loanDeduction: number;
  calc: PayrollTotals;
  slip: {
    id: number;
    reference: string;
    revision: number;
    netSalary: number;
    emailStatus: SalarySlipEmailStatus;
    createdAt: string;
  } | null;
  slipOutdated: boolean;
};

export type PayrollTotalsRow = Record<
  | 'grossSalary'
  | 'taxableSalary'
  | 'unpaidDeduction'
  | 'securityDeduction'
  | 'tax'
  | 'loanDeduction'
  | 'nonTaxableAddition'
  | 'taxableAddition'
  | 'netSalary'
  | 'paid'
  | 'balance',
  number
>;

export type PayrollSheet = {
  month: string;
  monthLabel: string;
  workingDays: number;
  daysInMonth: number;
  /** ALL = HR / Admin (every cell but Tax); TAX_AND_PAID = the accountant. */
  editable: 'ALL' | 'TAX_AND_PAID';
  /** Tax is entered by the accountant only. */
  canEditTax: boolean;
  rows: PayrollRow[];
  totals: PayrollTotalsRow;
};

export type PayrollEntryPatch = Partial<PayrollEntryInputs>;

// ---- Loans ------------------------------------------------------------

export type EmployeeLoanStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface EmployeeLoanDto {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string | null;
  principal: number;
  instalments: number;
  monthlyInstalment: number;
  startMonth: string;
  startMonthLabel: string;
  status: EmployeeLoanStatus;
  recovered: number;
  remaining: number;
  instalmentsPaid: number;
  notes: string | null;
  createdByName: string | null;
  createdAt: string;
}

export type CreateLoanPayload = {
  employeeId: number;
  principal: number;
  instalments: number;
  startMonth: string;
  notes?: string;
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

const SECURITY_PERCENT: Record<SecurityDeductionMode, number | null> = {
  NONE: 0,
  PERCENT_5: 5,
  PERCENT_10: 10,
  MANUAL: null,
};

/**
 * The "Payroll for IT" sheet formula — same as the backend's calculatePayroll (in paisa):
 * Per day = Gross / Working days; Unpaid = Per day × Unpaid holidays; Security = 5% / 10% of
 * Gross or manual; Taxable = Gross − Unpaid − Security + Taxable addition;
 * Net = Gross − Unpaid − Security − Tax − Loan + Non-taxable + Taxable addition; Balance = Net − Paid.
 */
export function calculatePayroll(input: {
  grossSalary: number;
  workingDays: number;
  unpaidDays: number;
  securityMode: SecurityDeductionMode;
  securityAmount: number;
  tax: number;
  loanDeduction: number;
  nonTaxableAddition: number;
  taxableAddition: number;
  paid: number;
}): PayrollTotals {
  const p = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 100);
  const gross = p(input.grossSalary);
  const workingDays = input.workingDays > 0 ? input.workingDays : 0;
  const unpaidDays = Number.isFinite(input.unpaidDays) ? input.unpaidDays : 0;
  const unpaid = workingDays ? Math.round((gross * unpaidDays) / workingDays) : 0;
  const percent = SECURITY_PERCENT[input.securityMode];
  const security = percent === null ? p(input.securityAmount) : Math.round((gross * percent) / 100);
  const nonTaxable = p(input.nonTaxableAddition);
  const taxable = p(input.taxableAddition);
  const deductions = unpaid + security + p(input.tax) + p(input.loanDeduction);
  const net = gross - deductions + nonTaxable + taxable;
  return {
    perDaySalary: workingDays ? Math.round(gross / workingDays) / 100 : 0,
    unpaidDeduction: unpaid / 100,
    securityDeduction: security / 100,
    taxableSalary: (gross - unpaid - security + taxable) / 100,
    totalAdditions: (nonTaxable + taxable) / 100,
    totalEarnings: (gross + nonTaxable + taxable) / 100,
    totalDeductions: deductions / 100,
    netSalary: net / 100,
    balance: (net - p(input.paid)) / 100,
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
    return (
      typeof url === 'string' &&
      (url.startsWith('/salary-slips') || url.startsWith('/payroll') || url.startsWith('/loans'))
    );
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

export async function fetchSalarySlip(id: number): Promise<SalarySlipDto> {
  const res = await axiosInstance.get(endpoints.salarySlips.details(id));
  return res.data.data;
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

// ---- Payroll sheet ----------------------------------------------------

const sheetKey = (month: string) => [endpoints.payroll.sheet, { params: { month } }];

export function useGetPayrollSheet(month?: string, enabled = true) {
  const { data, isLoading, error } = useSWR<{ data: PayrollSheet }>(
    enabled && month ? sheetKey(month) : null,
    fetcher,
    swrOptions
  );
  return useMemo(
    () => ({
      sheet: data?.data,
      sheetLoading: isLoading,
      sheetError: error as Error | undefined,
    }),
    [data?.data, isLoading, error]
  );
}

/** Saves the cells that changed on one row; the sheet is refetched so the totals row matches. */
export async function updatePayrollEntry(
  employeeId: number,
  month: string,
  patch: PayrollEntryPatch
): Promise<PayrollRow> {
  const res = await axiosInstance.put(endpoints.payroll.entry(employeeId), { month, ...patch });
  await mutate(sheetKey(month));
  return res.data.data;
}

/** Downloads the month's Excel file: Employee name and Net salary, with a total. */
export async function exportPayrollSheet(month: string): Promise<void> {
  const res = await axiosInstance.get(endpoints.payroll.export, {
    params: { month },
    responseType: 'blob',
  });
  downloadBlob(new Blob([res.data]), `Salaries-${month}.xlsx`);
}

/** The sheet's "Number of working days", applied to every row. */
export async function setPayrollWorkingDays(month: string, workingDays: number) {
  const res = await axiosInstance.put(endpoints.payroll.workingDays, { month, workingDays });
  await mutate(sheetKey(month), res.data, { revalidate: false });
  return res.data.data as PayrollSheet;
}

/** Generates (or regenerates) the employee's slip from their sheet row. */
export async function generateSlipFromPayroll(
  employeeId: number,
  month: string,
  regenerate = false
): Promise<SalarySlipDto> {
  const res = await axiosInstance.post(endpoints.payroll.generate(employeeId), {
    month,
    regenerate: regenerate || undefined,
  });
  await revalidateSalarySlips();
  return res.data.data;
}

// ---- Loans ------------------------------------------------------------

export function useGetLoans(
  query: { employeeId?: number; includeClosed?: boolean } = {},
  enabled = true
) {
  const params = Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== false)
  );
  const { data, isLoading, error } = useSWR<{ data: EmployeeLoanDto[] }>(
    enabled ? [endpoints.loans.list, { params }] : null,
    fetcher,
    swrOptions
  );
  return useMemo(
    () => ({
      loans: data?.data || [],
      loansLoading: isLoading,
      loansError: error as Error | undefined,
    }),
    [data?.data, isLoading, error]
  );
}

export async function createLoan(payload: CreateLoanPayload): Promise<EmployeeLoanDto> {
  const res = await axiosInstance.post(endpoints.loans.list, payload);
  await revalidateSalarySlips();
  return res.data.data;
}

export async function cancelLoan(id: number): Promise<EmployeeLoanDto> {
  const res = await axiosInstance.post(endpoints.loans.cancel(id));
  await revalidateSalarySlips();
  return res.data.data;
}

/** Equal monthly share (the last instalment takes whatever rounding left) — same as the backend. */
export function loanMonthlyInstalment(principal: number, instalments: number): number {
  if (!(principal > 0) || !(instalments > 0)) return 0;
  return instalments === 1 ? principal : Math.round((principal * 100) / instalments) / 100;
}
