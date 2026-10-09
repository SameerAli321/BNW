export enum InterviewStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED',
}

export enum InterviewMode {
  ONLINE = 'ONLINE',
  IN_PERSON = 'IN_PERSON',
  PHONE = 'PHONE',
}

/** What happened to the candidate's invitation email (see MailResult). */
export enum InterviewEmailStatus {
  SENT = 'SENT',
  FAILED = 'FAILED',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
}
