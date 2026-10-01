export enum AttendanceRegularizationStatus {
  PENDING_HOD = 'PENDING_HOD',
  HOD_NOT_RECOMMENDED = 'HOD_NOT_RECOMMENDED',
  PENDING_HR = 'PENDING_HR',
  TAKEN_ON_RECORD = 'TAKEN_ON_RECORD',
  NOT_IN_ORDER = 'NOT_IN_ORDER',
}

/** The two options in the paper form's "[For use by the HRD]" section. */
export enum AttendanceHrDecision {
  // "The regularization has been recommended by the designated authority and hence taken on
  // record, also received in time."
  TAKEN_ON_RECORD = 'TAKEN_ON_RECORD',
  // "The same is not in order. Hence put up to HOD, HRD (P)."
  NOT_IN_ORDER = 'NOT_IN_ORDER',
}
