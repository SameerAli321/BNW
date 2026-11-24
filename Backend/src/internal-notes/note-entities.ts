/**
 * Every create form with a "Notes for HR" box, and the table its record lives in (used to check
 * the record exists). Keep in sync with Frontend/vite-ts/src/actions/internal-notes.ts.
 */
export const NOTE_ENTITY_TABLES = {
  USER: 'users',
  LEAVE: 'leave_requests',
  BOOKING: 'bookings',
  WORK_ORDER: 'work_orders',
  COMPLAINT: 'complaints',
  APPRAISAL: 'appraisal_requests',
  ATTENDANCE: 'attendance_regularizations',
  ANNOUNCEMENT: 'announcements',
  LETTER: 'letters',
  LETTER_TEMPLATE: 'letter_templates',
  SALARY_SLIP: 'salary_slips',
  LOAN: 'employee_loans',
  OFF_DAY: 'off_days',
  DOCUMENT: 'employee_documents',
  DOCUMENT_REQUEST: 'document_requests',
  FORM_ASSIGNMENT: 'form_assignments',
  ACTIVITY_LOG: 'daily_activity_logs',
  INTERVIEW: 'interviews',
  JOINING_PACK_ITEM: 'joining_pack_items',
  BOOKING_RESOURCE: 'booking_resources',
} as const;

export type NoteEntity = keyof typeof NOTE_ENTITY_TABLES;

export const NOTE_ENTITIES = Object.keys(NOTE_ENTITY_TABLES) as NoteEntity[];
