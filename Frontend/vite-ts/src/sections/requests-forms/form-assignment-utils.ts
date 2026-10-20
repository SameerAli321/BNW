import type { Iconify } from 'src/components/iconify';
import type { FormAssignmentType } from 'src/actions/form-assignments';

import dayjs from 'dayjs';

import { fDate } from 'src/utils/format-time';

// ----------------------------------------------------------------------

type IconName = Parameters<typeof Iconify>[0]['icon'];

/** Same icons as the matching cards on the Requests & Forms page. */
export const FORM_ASSIGNMENT_ICON: Record<FormAssignmentType, IconName> = {
  LEAVE: 'solar:calendar-date-bold',
  COMPLAINT: 'solar:chat-round-dots-bold',
  ATTENDANCE_REGULARIZATION: 'solar:clock-circle-bold',
  ONBOARDING: 'solar:user-plus-bold',
  APPRAISAL: 'solar:cup-star-bold',
  REIMBURSEMENT: 'solar:wad-of-money-bold',
  EQUIPMENT: 'solar:monitor-bold',
};

/** "Due 24 Oct 2026" + a colour: red once overdue, amber when due today / tomorrow. */
export function dueDateInfo(dueDate: string | null): {
  text: string;
  color: 'error' | 'warning' | 'default';
} | null {
  if (!dueDate) return null;
  const daysLeft = dayjs(dueDate).startOf('day').diff(dayjs().startOf('day'), 'day');
  if (daysLeft < 0) return { text: `Overdue · was due ${fDate(dueDate)}`, color: 'error' };
  if (daysLeft === 0) return { text: 'Due today', color: 'warning' };
  if (daysLeft === 1) return { text: 'Due tomorrow', color: 'warning' };
  return { text: `Due ${fDate(dueDate)}`, color: 'default' };
}
