import type { SWRConfiguration } from 'swr';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — "HR sends a form". HR / ADMIN pick employees and a form; it shows on each employee's
// Requests & Forms page ("Forms sent to you") until they mark it done or HR / ADMIN cancel it.
// Mirrors Backend/src/form-assignments.

export type FormAssignmentType =
  | 'LEAVE'
  | 'COMPLAINT'
  | 'ATTENDANCE_REGULARIZATION'
  | 'ONBOARDING'
  | 'APPRAISAL'
  | 'REIMBURSEMENT'
  | 'EQUIPMENT';

export type FormAssignmentStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

/** Same labels as the backend's FORM_ASSIGNMENT_FORMS (the DTO also carries `formLabel`). */
export const FORM_ASSIGNMENT_TYPE_OPTIONS: { value: FormAssignmentType; label: string }[] = [
  { value: 'LEAVE', label: 'Leave request' },
  { value: 'COMPLAINT', label: 'Complaint' },
  { value: 'ATTENDANCE_REGULARIZATION', label: 'Attendance regularization' },
  { value: 'ONBOARDING', label: 'Onboarding form' },
  { value: 'APPRAISAL', label: 'Self evaluation (appraisal)' },
  { value: 'REIMBURSEMENT', label: 'Reimbursement claim' },
  { value: 'EQUIPMENT', label: 'Equipment request' },
];

export const FORM_ASSIGNMENT_STATUS_COLOR: Record<
  FormAssignmentStatus,
  'warning' | 'success' | 'default'
> = {
  PENDING: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'default',
};

export interface FormAssignmentDto {
  id: number;
  userId: number;
  userName: string;
  formType: FormAssignmentType;
  formLabel: string;
  message: string | null;
  dueDate: string | null; // 'YYYY-MM-DD'
  status: FormAssignmentStatus;
  assignedById: number | null;
  assignedByName: string | null;
  completedAt: string | null;
  createdAt: string;
  /** Frontend path that opens the form, e.g. '/dashboard/leave-requests/new'. */
  link: string;
}

export type SendFormAssignmentPayload = {
  userIds: number[];
  formType: FormAssignmentType;
  message?: string;
  dueDate?: string;
};

export type FormAssignmentsQuery = {
  status?: FormAssignmentStatus | '';
  formType?: FormAssignmentType | '';
  userId?: number;
  page?: number;
  limit?: number;
};

const swrOptions: SWRConfiguration = {
  revalidateIfStale: true,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

const revalidateFormAssignments = () =>
  mutate((key) => {
    const url = Array.isArray(key) ? key[0] : key;
    return typeof url === 'string' && url.startsWith('/form-assignments');
  });

// ----------------------------------------------------------------------

/** GET /form-assignments/mine — the forms sent to the caller (any role). */
export function useGetMyFormAssignments(status?: FormAssignmentStatus) {
  const { data, isLoading } = useSWR<{ data: FormAssignmentDto[] }>(
    [endpoints.formAssignments.mine, { params: status ? { status } : {} }],
    fetcher,
    swrOptions
  );
  return useMemo(
    () => ({
      myFormAssignments: data?.data || [],
      myFormAssignmentsLoading: isLoading,
    }),
    [data?.data, isLoading]
  );
}

/** GET /form-assignments — HR / ADMIN only; pass `enabled = false` for everyone else. */
export function useGetFormAssignments(query: FormAssignmentsQuery = {}, enabled = true) {
  const params = Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== '')
  );
  const { data, isLoading } = useSWR<{
    data: FormAssignmentDto[];
    meta: { total: number; page: number; limit: number };
  }>(enabled ? [endpoints.formAssignments.list, { params }] : null, fetcher, swrOptions);
  return useMemo(
    () => ({
      formAssignments: data?.data || [],
      formAssignmentsMeta: data?.meta,
      formAssignmentsLoading: isLoading,
    }),
    [data?.data, data?.meta, isLoading]
  );
}

/** POST /form-assignments — HR / ADMIN. One assignment (and one bell + email) per employee. */
export async function sendFormAssignment(
  payload: SendFormAssignmentPayload
): Promise<FormAssignmentDto[]> {
  const res = await axiosInstance.post(endpoints.formAssignments.list, payload);
  await revalidateFormAssignments();
  return res.data.data;
}

/** POST /form-assignments/:id/complete — the assignee, or HR / ADMIN. */
export async function completeFormAssignment(id: number): Promise<FormAssignmentDto> {
  const res = await axiosInstance.post(endpoints.formAssignments.complete(id));
  await revalidateFormAssignments();
  return res.data.data;
}

/** POST /form-assignments/:id/cancel — HR / ADMIN (the employee gets a bell notification). */
export async function cancelFormAssignment(id: number): Promise<FormAssignmentDto> {
  const res = await axiosInstance.post(endpoints.formAssignments.cancel(id));
  await revalidateFormAssignments();
  return res.data.data;
}
