/** What can be booked from the Bookings module. */
export enum BookingType {
  /** A meeting with invited employees (optionally in a meeting room). */
  MEETING = 'MEETING',
  /** A meeting room on its own. */
  MEETING_ROOM = 'MEETING_ROOM',
  /** A pool-table slot. */
  POOL_TABLE = 'POOL_TABLE',
  /**
   * Anything else that blocks your own calendar — Namaz, Masjid, lunch, a doctor's visit. No room,
   * no invitees; the activity is the title and you show as busy (client CEO, Oct 2026).
   */
  OTHER = 'OTHER',
}

/** Personal types: details are private, like meetings, and the organiser shows as busy. */
export const PERSONAL_BOOKING_TYPES: BookingType[] = [BookingType.MEETING, BookingType.OTHER];

/** How a new booking repeats. Each occurrence is its own booking, linked by `seriesId`. */
export enum BookingRepeat {
  DAILY = 'DAILY',
  WEEKDAYS = 'WEEKDAYS',
  WEEKLY = 'WEEKLY',
}

/** At most this many occurrences, and no further ahead than this many days. */
export const BOOKING_REPEAT_MAX_OCCURRENCES = 100;
export const BOOKING_REPEAT_MAX_DAYS = 183;

/**
 * Bookings are confirmed as soon as they're made (no approval step — the slot is checked for
 * clashes when it's saved); cancelling keeps the record for history.
 */
export enum BookingStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

/** Bookable things HR / Admin manage under Bookings → Rooms & tables. */
export enum BookingResourceType {
  MEETING_ROOM = 'MEETING_ROOM',
  POOL_TABLE = 'POOL_TABLE',
}
