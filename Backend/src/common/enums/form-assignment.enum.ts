/** Which form HR / Admin asked the employee to fill in. */
export enum FormAssignmentType {
  LEAVE = 'LEAVE',
  COMPLAINT = 'COMPLAINT',
  ATTENDANCE_REGULARIZATION = 'ATTENDANCE_REGULARIZATION',
  ONBOARDING = 'ONBOARDING',
  APPRAISAL = 'APPRAISAL',
  REIMBURSEMENT = 'REIMBURSEMENT',
  EQUIPMENT = 'EQUIPMENT',
}

/** PENDING until the employee (or HR / Admin) marks it done, or HR / Admin cancel it. */
export enum FormAssignmentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/** Display name and the frontend page that opens the form, per form type. */
export const FORM_ASSIGNMENT_FORMS: Record<FormAssignmentType, { label: string; link: string }> = {
  [FormAssignmentType.LEAVE]: { label: 'Leave request', link: '/dashboard/leave-requests/new' },
  [FormAssignmentType.COMPLAINT]: { label: 'Complaint', link: '/dashboard/complaints/new' },
  [FormAssignmentType.ATTENDANCE_REGULARIZATION]: {
    label: 'Attendance regularization',
    link: '/dashboard/attendance-regularizations/new',
  },
  [FormAssignmentType.ONBOARDING]: {
    label: 'Onboarding form',
    link: '/dashboard/onboarding-forms/mine',
  },
  [FormAssignmentType.APPRAISAL]: {
    label: 'Self evaluation (appraisal)',
    link: '/dashboard/appraisals/new',
  },
  [FormAssignmentType.REIMBURSEMENT]: {
    label: 'Reimbursement claim',
    link: '/dashboard/work-orders/new?type=REIMBURSEMENT',
  },
  [FormAssignmentType.EQUIPMENT]: {
    label: 'Equipment request',
    link: '/dashboard/work-orders/new?type=EQUIPMENT',
  },
};
