/**
 * Minimal iCalendar (RFC 5545) builder for meeting invites — enough for Gmail, Outlook and Apple
 * Calendar to show "Add to calendar" / auto-add, and to update or cancel the same event later
 * (same UID, higher SEQUENCE).
 */

export type IcsEvent = {
  uid: string;
  sequence: number;
  method: 'REQUEST' | 'CANCEL';
  start: Date;
  end: Date;
  summary: string;
  description: string;
  location?: string | null;
  url?: string | null;
  organizer: { name: string; email: string };
  attendees: { name: string; email: string }[];
};

const utc = (date: Date): string =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

/** Escape text values (commas, semicolons, backslashes, newlines). */
const esc = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 octets (bytes, not characters) must be folded: CRLF + one space. */
function fold(line: string): string {
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char);
    const limit = parts.length ? 74 : 75; // continuation lines start with a space
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function buildIcs(event: IcsEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//BNW Chartered Accountants//BNW OMS//EN',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    `METHOD:${event.method}`,
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `SEQUENCE:${event.sequence}`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(event.start)}`,
    `DTEND:${utc(event.end)}`,
    `SUMMARY:${esc(event.summary)}`,
    `DESCRIPTION:${esc(event.description)}`,
    ...(event.location ? [`LOCATION:${esc(event.location)}`] : []),
    ...(event.url ? [`URL:${event.url}`] : []),
    `ORGANIZER;CN=${esc(event.organizer.name)}:mailto:${event.organizer.email}`,
    ...event.attendees.map(
      (a) =>
        `ATTENDEE;CN=${esc(a.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${a.email}`,
    ),
    `STATUS:${event.method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'}`,
    'TRANSP:OPAQUE',
    ...(event.method === 'REQUEST'
      ? [
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          'DESCRIPTION:Interview reminder',
          'TRIGGER:-PT30M',
          'END:VALARM',
        ]
      : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
