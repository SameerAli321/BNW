/** Whether a salary slip has been emailed to the employee. FAILED keeps the error for a resend. */
export enum SalarySlipEmailStatus {
  NOT_SENT = 'NOT_SENT',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export const SALARY_PAYMENT_METHODS = ['Bank transfer', 'Cheque', 'Cash'] as const;

/** How the slip was calculated. LEGACY = allowances / bonus / overtime; PAYROLL = the payroll sheet. */
export enum SalarySlipScheme {
  LEGACY = 'LEGACY',
  PAYROLL = 'PAYROLL',
}

/** Security deduction on the payroll sheet: 5% or 10% of gross salary, or an amount typed in. */
export enum SecurityDeductionMode {
  NONE = 'NONE',
  PERCENT_5 = 'PERCENT_5',
  PERCENT_10 = 'PERCENT_10',
  MANUAL = 'MANUAL',
}

export const SECURITY_DEDUCTION_LABEL: Record<SecurityDeductionMode, string> = {
  [SecurityDeductionMode.NONE]: 'None',
  [SecurityDeductionMode.PERCENT_5]: '5% of gross',
  [SecurityDeductionMode.PERCENT_10]: '10% of gross',
  [SecurityDeductionMode.MANUAL]: 'Manual',
};

/** A loan repaid in equal monthly instalments. Completed is worked out from what was recovered. */
export enum EmployeeLoanStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
}
