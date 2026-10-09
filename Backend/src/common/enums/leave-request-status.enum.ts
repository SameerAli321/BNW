export enum LeaveRequestStatus {
  PENDING_MANAGER = 'PENDING_MANAGER',
  PENDING_HR = 'PENDING_HR',
  APPROVED = 'APPROVED',
  /** Approved leave the employee asked to cancel — still approved until HR / Admin decide. */
  CANCELLATION_REQUESTED = 'CANCELLATION_REQUESTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}
