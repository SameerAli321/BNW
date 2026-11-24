import type { SWRConfiguration } from 'swr';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import { paths } from 'src/routes/paths';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// "Notes for HR" — the free-text box on every create form (client decision, Nov 2026). Anyone
// writes one when they create something; only HR / Admin read them (Internal notes page, and the
// notes card on detail pages). Backend: Backend/src/internal-notes.

/** Keep in sync with Backend/src/internal-notes/note-entities.ts. */
export const NOTE_ENTITY_LABELS = {
  USER: 'User',
  LEAVE: 'Leave request',
  BOOKING: 'Booking',
  WORK_ORDER: 'Expense claim',
  COMPLAINT: 'Complaint',
  APPRAISAL: 'Appraisal',
  ATTENDANCE: 'Attendance regularization',
  ANNOUNCEMENT: 'Announcement',
  LETTER: 'Letter',
  LETTER_TEMPLATE: 'Letter template',
  SALARY_SLIP: 'Salary slip',
  LOAN: 'Loan',
  OFF_DAY: 'Office off day',
  DOCUMENT: 'Document',
  DOCUMENT_REQUEST: 'Document request',
  FORM_ASSIGNMENT: 'Form sent',
  ACTIVITY_LOG: 'Activity log',
  INTERVIEW: 'Interview',
  JOINING_PACK_ITEM: 'Joining pack item',
  BOOKING_RESOURCE: 'Room / resource',
} as const;

export type NoteEntity = keyof typeof NOTE_ENTITY_LABELS;

export const NOTE_ENTITY_OPTIONS = (Object.keys(NOTE_ENTITY_LABELS) as NoteEntity[]).map(
  (value) => ({ value, label: NOTE_ENTITY_LABELS[value] })
);

/** Where to open the record a note is about, when it has its own page. */
export function noteEntityHref(entity: string, id: number): string | null {
  switch (entity) {
    case 'USER':
      return paths.dashboard.user.details(id);
    case 'LEAVE':
      return paths.dashboard.leaveRequests.details(id);
    case 'BOOKING':
      return paths.dashboard.bookings.details(id);
    case 'WORK_ORDER':
      return paths.dashboard.workOrders.details(id);
    case 'COMPLAINT':
      return paths.dashboard.complaints.details(id);
    case 'APPRAISAL':
      return paths.dashboard.appraisals.details(id);
    case 'ATTENDANCE':
      return paths.dashboard.attendanceRegularizations.details(id);
    case 'LETTER':
      return paths.dashboard.letters.details(id);
    default:
      return null;
  }
}

export type InternalNoteDto = {
  id: number;
  entity: NoteEntity;
  entityId: number;
  note: string;
  createdById: number | null;
  createdByName: string | null;
  createdAt: string;
};

export type InternalNotesFilters = {
  entity?: NoteEntity | '';
  entityId?: number;
  q?: string;
  page?: number;
  limit?: number;
};

const swrOptions: SWRConfiguration = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

/** GET /internal-notes — HR / ADMIN only; pass `enabled: false` for anyone else. */
export function useGetInternalNotes(filters: InternalNotesFilters, enabled = true) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')
  );
  const { data, isLoading, error } = useSWR<{
    data: InternalNoteDto[];
    meta: { total: number; page: number; limit: number };
  }>(enabled ? [endpoints.internalNotes, { params }] : null, fetcher, swrOptions);

  return useMemo(
    () => ({
      notes: data?.data || [],
      notesMeta: data?.meta,
      notesLoading: isLoading,
      notesError: error,
    }),
    [data?.data, data?.meta, error, isLoading]
  );
}

function revalidateNotes() {
  return mutate((key) => Array.isArray(key) && key[0] === endpoints.internalNotes);
}

/**
 * POST /internal-notes — call right after the record is created. Does nothing for a blank note.
 * Throws if it can't be saved (the record itself is already created by then).
 */
export async function saveInternalNote(
  entity: NoteEntity,
  entityId: number | string | undefined | null,
  note: string
): Promise<void> {
  const text = note.trim();
  if (!text || entityId === undefined || entityId === null) return;
  await axiosInstance.post(endpoints.internalNotes, { entity, entityId: Number(entityId), note: text });
  await revalidateNotes();
}

/** DELETE /internal-notes/:id — HR / ADMIN. */
export async function deleteInternalNote(id: number): Promise<void> {
  await axiosInstance.delete(`${endpoints.internalNotes}/${id}`);
  await revalidateNotes();
}
