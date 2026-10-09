/** Whether a salary slip has been emailed to the employee. FAILED keeps the error for a resend. */
export enum SalarySlipEmailStatus {
  NOT_SENT = 'NOT_SENT',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export const SALARY_PAYMENT_METHODS = ['Bank transfer', 'Cheque', 'Cash'] as const;
