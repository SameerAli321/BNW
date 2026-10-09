import type { SalaryLineItem } from '../entities/salary-slip.entity';

/** Work in paisa so 0.1 + 0.2 style float errors never reach a payslip. */
const toPaisa = (value: number | null | undefined) => Math.round((value ?? 0) * 100);
const fromPaisa = (paisa: number) => paisa / 100;

export type SalaryInputs = {
  basicSalary: number;
  allowances: SalaryLineItem[];
  bonus: number;
  overtime: number;
  deductions: SalaryLineItem[];
  tax: number;
};

export type SalaryTotals = {
  totalAllowances: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
};

/**
 * Gross = Basic + Allowances + Bonus + Overtime.
 * Total deductions = itemised deductions + tax.
 * Net = Gross − Total deductions.
 */
export function calculateSalary(input: SalaryInputs): SalaryTotals {
  const allowances = input.allowances.reduce((sum, item) => sum + toPaisa(item.amount), 0);
  const gross =
    toPaisa(input.basicSalary) + allowances + toPaisa(input.bonus) + toPaisa(input.overtime);
  const deductions =
    input.deductions.reduce((sum, item) => sum + toPaisa(item.amount), 0) + toPaisa(input.tax);
  return {
    totalAllowances: fromPaisa(allowances),
    grossSalary: fromPaisa(gross),
    totalDeductions: fromPaisa(deductions),
    netSalary: fromPaisa(gross - deductions),
  };
}

/** 'Rs 125,000.00' — slips always show paisa. */
export const formatSalaryAmount = (amount: number) =>
  `Rs ${amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** '2026-09' → 'September 2026'. */
export function formatSalaryMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1] ?? month} ${year}`;
}

/** Number of days in a 'YYYY-MM' month. */
export function daysInMonth(month: string): number {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowThousand(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ''));
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(' ');
}

function integerToWords(n: number): string {
  if (n === 0) return 'Zero';
  const scales: [number, string][] = [
    [1_000_000_000, 'Billion'],
    [1_000_000, 'Million'],
    [1_000, 'Thousand'],
  ];
  const parts: string[] = [];
  for (const [size, name] of scales) {
    if (n >= size) {
      parts.push(`${belowThousand(Math.floor(n / size))} ${name}`);
      n %= size;
    }
  }
  if (n > 0) parts.push(belowThousand(n));
  return parts.join(' ');
}

/** 125000.5 → 'Rupees One Hundred Twenty-Five Thousand and Fifty Paisa Only'. */
export function amountInWords(amount: number): string {
  const paisaTotal = Math.round(Math.abs(amount) * 100);
  const rupees = Math.floor(paisaTotal / 100);
  const paisa = paisaTotal % 100;
  const words = `Rupees ${integerToWords(rupees)}${paisa ? ` and ${integerToWords(paisa)} Paisa` : ''} Only`;
  return amount < 0 ? `Minus ${words}` : words;
}

/** Show only the last 4 digits of an account number on documents. */
export function maskAccountNumber(value: string | null): string | null {
  if (!value) return null;
  const compact = value.replace(/\s+/g, '');
  return compact.length <= 4
    ? compact
    : `${'*'.repeat(Math.min(compact.length - 4, 8))}${compact.slice(-4)}`;
}
