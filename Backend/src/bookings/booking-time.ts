import { INTERVIEW_TIME_ZONE, dateToPkt, pktToDate } from '../interviews/interview-emails';

/**
 * Bookings use Pakistan time (PKT, UTC+5) like interviews: forms send a PKT day + time, the
 * database stores the exact instant, and everything shown to people is PKT.
 */
export { dateToPkt, pktToDate };

export const BOOKING_TIME_ZONE = INTERVIEW_TIME_ZONE;

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** First instant of a PKT day, and of the day after it. */
export function pktDayRange(date: string): { start: Date; end: Date } {
  const start = pktToDate(date, '00:00');
  return { start, end: addMinutes(start, 24 * 60) };
}

const time = (value: Date) =>
  value.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: BOOKING_TIME_ZONE,
  });

/** "Tue, 20 Oct 2026 · 10:00 AM – 11:30 AM PKT" */
export function formatBookingWhen(start: Date, end: Date): string {
  const day = start.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: BOOKING_TIME_ZONE,
  });
  return `${day} · ${time(start)} – ${time(end)} PKT`;
}

/** 90 -> "1 h 30 min" */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
