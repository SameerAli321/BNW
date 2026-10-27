import type { SWRConfiguration } from 'swr';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — bookings. Mirrors Backend/src/bookings. Three kinds: meetings (organised by the CEO,
// HR / Admin and Team Leads, with invited employees), meeting rooms and the pool table (anyone).
// Bookings are confirmed instantly; clashes are rejected by the backend. All times are Pakistan
// time (PKT) — see src/sections/booking/booking-utils.ts.

export type BookingType = 'MEETING' | 'MEETING_ROOM' | 'POOL_TABLE' | 'OTHER';

/** Repeat a new booking; each day becomes its own booking in the same series. */
export type BookingRepeat = 'DAILY' | 'WEEKDAYS' | 'WEEKLY';
export type BookingStatus = 'CONFIRMED' | 'CANCELLED';
export type BookingResourceType = 'MEETING_ROOM' | 'POOL_TABLE';

/** Who may organise meetings (Team Members only attend). Mirrors MEETING_ORGANIZER_ROLES. */
export const MEETING_ORGANIZER_ROLES = ['CEO', 'HR', 'ADMIN', 'MANAGER'];
/** Who manage rooms & tables (and may change anyone's room / pool-table booking). */
export const BOOKING_ADMIN_ROLES = ['HR', 'ADMIN'];

export interface BookingPerson {
  id: number;
  name: string;
  designation: string | null;
}

export interface BookingResource {
  id: number;
  type: BookingResourceType;
  name: string;
  location: string | null;
  capacity: number | null;
  isActive: boolean;
}

export interface BookingDto {
  id: number;
  type: BookingType;
  status: BookingStatus;
  /** A meeting / "Others" block the viewer isn't part of — only the busy time is shown. */
  isPrivate: boolean;
  /** Shared by every occurrence of a repeating booking; null for a one-off. */
  seriesId: string | null;
  title: string;
  purpose: string | null;
  description: string | null;
  startAt: string;
  endAt: string;
  /** PKT 'YYYY-MM-DD' / 'HH:mm'. */
  date: string;
  time: string;
  durationMinutes: number;
  resource: BookingResource | null;
  location: string | null;
  organizer: BookingPerson | null;
  createdBy: BookingPerson | null;
  participants: BookingPerson[];
  isInvolved: boolean;
  canManage: boolean;
  isPast: boolean;
  cancelReason: string | null;
  cancelledAt: string | null;
  cancelledBy: BookingPerson | null;
  createdAt: string;
  updatedAt: string;
}

export type BookingPayload = {
  title?: string;
  purpose?: string | null;
  description?: string | null;
  date: string;
  time: string;
  durationMinutes: number;
  resourceId?: number | null;
  location?: string | null;
  participantIds?: number[];
};

export type BookingFilters = {
  from?: string;
  to?: string;
  type?: BookingType | '';
  status?: BookingStatus | '';
  resourceId?: number | '';
  userId?: number | '';
  scope?: 'mine' | 'all';
  when?: 'upcoming' | 'past';
  search?: string;
  page?: number;
  limit?: number;
};

export type BusyInterval = { startAt: string; endAt: string };

export type BookingAvailability = {
  date: string;
  resource: Array<BusyInterval & { type: BookingType }>;
  people: Array<{ userId: number; name: string; busy: BusyInterval[] }>;
};

export type BookingPickerPerson = {
  id: number;
  name: string;
  designation: string | null;
  department: string | null;
};

/** Who may view every employee's calendar. Mirrors CALENDAR_VIEW_ALL_ROLES. */
export const CALENDAR_VIEW_ALL_ROLES = ['ADMIN', 'HR', 'CEO'];

/** Someone whose calendar the viewer may open (GET /bookings/calendar-people). */
export type CalendarPerson = BookingPickerPerson & { isSelf: boolean };

export type CalendarLeaveStatus =
  | 'APPROVED'
  | 'CANCELLATION_REQUESTED'
  | 'PENDING_MANAGER'
  | 'PENDING_HR';

/** Leave shown on the calendar (GET /bookings/calendar-leaves). Dates are inclusive. */
export type CalendarLeave = {
  id: number;
  userId: number;
  employeeName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  days: number;
  halfDay: boolean;
  status: CalendarLeaveStatus;
  /** Still waiting for the manager / HR. */
  isPending: boolean;
  /** The viewer may open the leave request (own, HR / Admin / CEO, or its approving manager). */
  canOpen: boolean;
};

type ListResponse = { data: BookingDto[]; meta: { total: number; page: number; limit: number } };
/** Single items / plain arrays come back wrapped by the API as { data }. */
type Envelope<T> = { data: T };

const clean = (params: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));

// Calendars and dashboards poll, so other people's changes show up without a reload.
const liveOptions: SWRConfiguration = {
  revalidateOnFocus: true,
  refreshInterval: 60_000,
  keepPreviousData: true,
};

// ----------------------------------------------------------------------

export function useGetBookings(filters: BookingFilters, enabled = true) {
  const key = enabled ? [endpoints.bookings.list, { params: clean(filters) }] : null;
  const { data, isLoading, error, isValidating } = useSWR<ListResponse>(key, fetcher, liveOptions);

  return useMemo(
    () => ({
      bookings: data?.data ?? [],
      bookingsTotal: data?.meta.total ?? 0,
      bookingsLoading: isLoading,
      bookingsError: error,
      bookingsValidating: isValidating,
    }),
    [data, error, isLoading, isValidating]
  );
}

export function useGetBooking(id: number | string | undefined) {
  const { data, isLoading, error } = useSWR<Envelope<BookingDto>>(
    id ? endpoints.bookings.details(id) : null,
    fetcher,
    { revalidateOnFocus: true }
  );
  return useMemo(
    () => ({ booking: data?.data, bookingLoading: isLoading, bookingError: error }),
    [data, error, isLoading]
  );
}

/** Dashboard card — the caller's own upcoming meetings. */
export function useGetUpcomingMeetings(limit = 4) {
  const { data, isLoading, error } = useSWR<{ data: BookingDto[]; total: number }>(
    [endpoints.bookings.upcomingMeetings, { params: { limit } }],
    fetcher,
    liveOptions
  );
  return useMemo(
    () => ({
      meetings: data?.data ?? [],
      meetingsTotal: data?.total ?? 0,
      meetingsLoading: isLoading,
      meetingsError: error,
    }),
    [data, error, isLoading]
  );
}

export function useGetBookingAvailability(params: {
  date: string;
  resourceId?: number | null;
  userIds?: number[];
  excludeBookingId?: number;
}) {
  const query = clean({
    date: params.date,
    resourceId: params.resourceId ?? undefined,
    userIds: params.userIds?.length ? params.userIds.join(',') : undefined,
    excludeBookingId: params.excludeBookingId,
  });
  const ready = /^\d{4}-\d{2}-\d{2}$/.test(params.date);
  const { data, isLoading } = useSWR<Envelope<BookingAvailability>>(
    ready ? [endpoints.bookings.availability, { params: query }] : null,
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: true }
  );
  return useMemo(
    () => ({ availability: data?.data, availabilityLoading: isLoading }),
    [data, isLoading]
  );
}

export function useGetBookingPeople(enabled: boolean) {
  const { data, isLoading } = useSWR<Envelope<BookingPickerPerson[]>>(
    enabled ? endpoints.bookings.people : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  return useMemo(() => ({ people: data?.data ?? [], peopleLoading: isLoading }), [data, isLoading]);
}

/** "Calendar of" picker — the viewer + whoever's calendar they may view (team / everyone). */
export function useGetCalendarPeople(enabled = true) {
  const { data, isLoading } = useSWR<Envelope<CalendarPerson[]>>(
    enabled ? endpoints.bookings.calendarPeople : null,
    fetcher,
    { revalidateOnFocus: true }
  );
  return useMemo(
    () => ({ calendarPeople: data?.data ?? [], calendarPeopleLoading: isLoading }),
    [data, isLoading]
  );
}

/** Leave in a calendar range (PKT days, inclusive), optionally for one person. */
export function useGetCalendarLeaves(
  params: { from?: string; to?: string; userId?: number | '' },
  enabled = true
) {
  const key =
    enabled && params.from && params.to
      ? [endpoints.bookings.calendarLeaves, { params: clean(params) }]
      : null;
  const { data, isLoading } = useSWR<Envelope<CalendarLeave[]>>(key, fetcher, liveOptions);
  return useMemo(() => ({ leaves: data?.data ?? [], leavesLoading: isLoading }), [data, isLoading]);
}

export function useGetBookingResources(
  options: {
    type?: BookingResourceType;
    includeInactive?: boolean;
  } = {}
) {
  const { data, isLoading } = useSWR<Envelope<BookingResource[]>>(
    [endpoints.bookings.resources, { params: clean(options) }],
    fetcher,
    { revalidateOnFocus: false }
  );
  return useMemo(
    () => ({ resources: data?.data ?? [], resourcesLoading: isLoading }),
    [data, isLoading]
  );
}

// ----------------------------------------------------------------------

/** Every cached bookings list / calendar range, the dashboard card and availability. */
function revalidateBookings() {
  return mutate(
    (key) =>
      (Array.isArray(key) &&
        typeof key[0] === 'string' &&
        (key[0].startsWith('/bookings') || key[0] === endpoints.bookings.resources)) ||
      (typeof key === 'string' && key.startsWith('/bookings/'))
  );
}

export async function createBooking(
  payload: BookingPayload & {
    type: BookingType;
    repeat?: { frequency: BookingRepeat; until: string };
  }
): Promise<BookingDto> {
  const res = await axiosInstance.post(endpoints.bookings.list, payload);
  await revalidateBookings();
  return res.data.data;
}

export async function updateBooking(id: number, payload: BookingPayload): Promise<BookingDto> {
  const res = await axiosInstance.patch(endpoints.bookings.details(id), payload);
  await mutate(endpoints.bookings.details(id), res.data, false);
  await revalidateBookings();
  return res.data.data;
}

/** `scope: 'FOLLOWING'` also cancels the later bookings of a repeating series. */
export async function cancelBooking(
  id: number,
  reason?: string,
  scope: 'ONE' | 'FOLLOWING' = 'ONE'
): Promise<BookingDto> {
  const res = await axiosInstance.post(endpoints.bookings.cancel(id), { reason, scope });
  await mutate(endpoints.bookings.details(id), res.data, false);
  await revalidateBookings();
  return res.data.data;
}

export async function createBookingResource(payload: {
  type: BookingResourceType;
  name: string;
  location?: string | null;
  capacity?: number | null;
}): Promise<BookingResource> {
  const res = await axiosInstance.post(endpoints.bookings.resources, payload);
  await revalidateBookings();
  return res.data.data;
}

export async function updateBookingResource(
  id: number,
  payload: Partial<Pick<BookingResource, 'name' | 'location' | 'capacity' | 'isActive'>>
): Promise<BookingResource> {
  const res = await axiosInstance.patch(endpoints.bookings.resource(id), payload);
  await revalidateBookings();
  return res.data.data;
}
