import { SecurityDeductionMode } from '../common/enums/salary-slip.enum';

/** Work in paisa so 0.1 + 0.2 style float errors never reach a payslip. */
const toPaisa = (value: number | null | undefined) => Math.round((value ?? 0) * 100);
const fromPaisa = (paisa: number) => paisa / 100;

// Slips generated before the payroll sheet (scheme LEGACY) were Gross + Allowances + Bonus +
// Overtime − (Deductions + Tax); their stored totals are shown as they are.

export type PayrollInputs = {
  grossSalary: number;
  workingDays: number;
  unpaidDays: number;
  securityMode: SecurityDeductionMode;
  /** Only used when securityMode is MANUAL. */
  securityAmount: number;
  tax: number;
  loanDeduction: number;
  nonTaxableAddition: number;
  taxableAddition: number;
  paid: number;
};

export type PayrollTotals = {
  perDaySalary: number;
  unpaidDeduction: number;
  securityDeduction: number;
  taxableSalary: number;
  totalAdditions: number;
  /** Gross + additions — "Total earnings" on the slip. */
  totalEarnings: number;
  /** Unpaid + security + tax + loan. */
  totalDeductions: number;
  netSalary: number;
  balance: number;
};

const SECURITY_PERCENT: Record<SecurityDeductionMode, number | null> = {
  [SecurityDeductionMode.NONE]: 0,
  [SecurityDeductionMode.PERCENT_5]: 5,
  [SecurityDeductionMode.PERCENT_10]: 10,
  [SecurityDeductionMode.MANUAL]: null,
};

/**
 * The "Payroll for IT" sheet, cell for cell:
 *   Per working day = Gross / Working days                       (B15 = B13/B14)
 *   Unpaid salary   = Per working day × Unpaid holidays           (B17 = B15*B16)
 *   Security        = 5% / 10% of Gross, or a manual amount
 *   Taxable salary  = Gross − Unpaid − Security + Taxable addition (F = E-G-H+L)
 *   Net salary      = Gross − Unpaid − Security − Tax − Loan
 *                     + Non-taxable addition + Taxable addition    (M = E-G-H-I-J+K+L)
 *   Balance         = Net − Paid                                   (O = M-N)
 * Unpaid is worked out as Gross × days / working days so it is rounded once, not twice.
 */
export function calculatePayroll(input: PayrollInputs): PayrollTotals {
  const gross = toPaisa(input.grossSalary);
  const workingDays = input.workingDays > 0 ? input.workingDays : 0;
  const unpaid = workingDays ? Math.round((gross * input.unpaidDays) / workingDays) : 0;
  const percent = SECURITY_PERCENT[input.securityMode];
  const security =
    percent === null ? toPaisa(input.securityAmount) : Math.round((gross * percent) / 100);
  const tax = toPaisa(input.tax);
  const loan = toPaisa(input.loanDeduction);
  const nonTaxable = toPaisa(input.nonTaxableAddition);
  const taxable = toPaisa(input.taxableAddition);
  const deductions = unpaid + security + tax + loan;
  const net = gross - deductions + nonTaxable + taxable;
  return {
    perDaySalary: workingDays ? Math.round(gross / workingDays) / 100 : 0,
    unpaidDeduction: fromPaisa(unpaid),
    securityDeduction: fromPaisa(security),
    taxableSalary: fromPaisa(gross - unpaid - security + taxable),
    totalAdditions: fromPaisa(nonTaxable + taxable),
    totalEarnings: fromPaisa(gross + nonTaxable + taxable),
    totalDeductions: fromPaisa(deductions),
    netSalary: fromPaisa(net),
    balance: fromPaisa(net - toPaisa(input.paid)),
  };
}

/** Mon–Fri in a 'YYYY-MM' month — the starting "Number of working days" (22 for October 2026). */
export function weekdaysInMonth(month: string): number {
  const [year, m] = month.split('-').map(Number);
  let count = 0;
  for (let day = 1; day <= daysInMonth(month); day += 1) {
    const weekday = new Date(Date.UTC(year, m - 1, day)).getUTCDay();
    if (weekday !== 0 && weekday !== 6) count += 1;
  }
  return count;
}

/**
 * The next instalment of a loan: an equal share of the principal, except the last one, which takes
 * whatever is left so rounding never leaves a few paisa outstanding (Rs 100,000 over 6 months →
 * 5 × 16,666.67 + 16,666.65).
 */
export function nextLoanInstalment(
  principal: number,
  instalments: number,
  recovered: number,
  instalmentsPaid: number,
): number {
  const remaining = toPaisa(principal) - toPaisa(recovered);
  if (remaining <= 0) return 0;
  if (instalmentsPaid + 1 >= instalments) return fromPaisa(remaining);
  return fromPaisa(Math.min(Math.round(toPaisa(principal) / instalments), remaining));
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
