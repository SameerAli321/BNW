import type { IconifyName } from 'src/components/iconify';
import type { BookingDto, BookingType, BusyInterval, BookingRepeat } from 'src/actions/bookings';

// ----------------------------------------------------------------------
// Bookings are in Pakistan time (PKT, UTC+5, no daylight saving), like interviews — whatever the
// viewer's device clock says. The calendar runs in "UTC" mode and is fed PKT wall-clock times, so
// it shows PKT everywhere.

export const PKT_LABEL = 'PKT';
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
const TIME_ZONE = 'Asia/Karachi';

/** ISO instant -> PKT wall clock 'YYYY-MM-DDTHH:mm:ss' (no offset) for FullCalendar. */
export function toPktWallClock(iso: string | Date): string {
  const ms = (typeof iso === 'string' ? new Date(iso) : iso).getTime() + PKT_OFFSET_MS;
  return new Date(ms).toISOString().slice(0, 19);
}

/** Today in PKT, 'YYYY-MM-DD'. */
export function pktToday(): string {
  return toPktWallClock(new Date()).slice(0, 10);
}

/** PKT day + 'HH:mm' -> the exact instant. */
export function pktToDate(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+05:00`);
}

/** A FullCalendar (UTC-mode) date -> PKT 'YYYY-MM-DD' / 'HH:mm'. */
export function calendarDateParts(date: Date): { date: string; time: string } {
  const iso = date.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function fPktDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TIME_ZONE,
  });
}

export function fPktTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  });
}

/** "Tue, 20 Oct 2026 · 10:00 AM – 11:30 AM PKT" */
export function fPktRange(startAt: string, endAt: string): string {
  return `${fPktDate(startAt)} · ${fPktTime(startAt)} – ${fPktTime(endAt)} ${PKT_LABEL}`;
}

/** 'HH:mm' -> "10:30 AM" */
export function fClock(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** 90 -> "1 h 30 min" */
export function fDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

// ----------------------------------------------------------------------

export const BOOKING_TYPE_META: Record<
  BookingType,
  {
    label: string;
    action: string;
    icon: IconifyName;
    color: 'primary' | 'info' | 'success' | 'warning';
    description: string;
  }
> = {
  MEETING: {
    label: 'Meeting',
    action: 'Book a meeting',
    icon: 'solar:users-group-rounded-bold',
    color: 'primary',
    description: 'Invite employees; it appears on their dashboards.',
  },
  MEETING_ROOM: {
    label: 'Meeting room',
    action: 'Book a meeting room',
    icon: 'solar:monitor-bold',
    color: 'info',
    description: 'Reserve a room for a time slot.',
  },
  POOL_TABLE: {
    label: 'Pool table',
    action: 'Book the pool table',
    icon: 'solar:gamepad-bold',
    color: 'success',
    description: 'Reserve a game slot.',
  },
  OTHER: {
    label: 'Others',
    action: 'Block my time (Others)',
    icon: 'solar:clock-circle-bold',
    color: 'warning',
    description:
      'Block time on your own calendar for anything else — Namaz, Masjid, lunch. You show as busy; only people who can see your calendar see what it is.',
  },
};

export const BOOKING_TYPES: BookingType[] = ['MEETING', 'MEETING_ROOM', 'POOL_TABLE', 'OTHER'];

/** Quick picks for an "Others" booking. */
export const OTHER_ACTIVITY_SUGGESTIONS = ['Namaz', 'Masjid', 'Lunch', 'Doctor visit', 'Personal'];

export const BOOKING_REPEAT_OPTIONS: { value: BookingRepeat | ''; label: string }[] = [
  { value: '', label: 'Does not repeat' },
  { value: 'DAILY', label: 'Every day' },
  { value: 'WEEKDAYS', label: 'Every weekday (Mon–Fri)' },
  { value: 'WEEKLY', label: 'Every week' },
];

/** Where it happens: the room / table, or the meeting's free-text location. */
export function bookingPlace(booking: BookingDto): string {
  return booking.resource?.name ?? booking.location ?? '';
}

/** "Confirmed" / "Cancelled" / "Completed" (confirmed and already over) / "In progress". */
export function bookingStatusLabel(booking: BookingDto): {
  label: string;
  color: 'success' | 'error' | 'default' | 'warning';
} {
  if (booking.status === 'CANCELLED') return { label: 'Cancelled', color: 'error' };
  if (booking.isPast) return { label: 'Completed', color: 'default' };
  if (new Date(booking.startAt).getTime() <= Date.now()) {
    return { label: 'In progress', color: 'warning' };
  }
  return { label: 'Confirmed', color: 'success' };
}

// ----------------------------------------------------------------------
// Form options

/** Start times every 15 minutes, 7:00 AM – 9:45 PM. */
export const START_TIMES: string[] = Array.from({ length: (22 - 7) * 4 }, (_, i) => {
  const minutes = 7 * 60 + i * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

export const DURATIONS: number[] = [15, 30, 45, 60, 90, 120, 180, 240, 480];

/** True when [start, end) overlaps any busy interval. */
export function overlapsAny(start: Date, end: Date, busy: BusyInterval[]): boolean {
  return busy.some(
    (b) =>
      new Date(b.startAt).getTime() < end.getTime() && new Date(b.endAt).getTime() > start.getTime()
  );
}
