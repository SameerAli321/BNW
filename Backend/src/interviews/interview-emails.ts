import { InterviewMode } from '../common/enums/interview.enum';
import {
  BRAND,
  button,
  escapeHtml,
  textToHtml,
  detailsTable,
  EmailDetailRow,
  renderEmailLayout,
} from '../mail/email-layout';

/** All interview times are Pakistan time (PKT, UTC+5, no daylight saving). */
export const INTERVIEW_TIME_ZONE = 'Asia/Karachi';
export const INTERVIEW_TIME_ZONE_LABEL = 'PKT';
const PKT_OFFSET_HOURS = 5;

/** 'YYYY-MM-DD' + 'HH:mm' in Pakistan time → the exact instant. */
export function pktToDate(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh - PKT_OFFSET_HOURS, mm));
}

/** The instant → { date: 'YYYY-MM-DD', time: 'HH:mm' } in Pakistan time (for edit forms). */
export function dateToPkt(value: Date): { date: string; time: string } {
  const shifted = new Date(value.getTime() + PKT_OFFSET_HOURS * 3600_000);
  const iso = shifted.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

export function formatInterviewDate(value: Date): string {
  return value.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: INTERVIEW_TIME_ZONE,
  });
}

export function formatInterviewTime(value: Date): string {
  return `${value.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: INTERVIEW_TIME_ZONE,
  })} ${INTERVIEW_TIME_ZONE_LABEL}`;
}

export const MODE_LABEL: Record<InterviewMode, string> = {
  [InterviewMode.ONLINE]: 'Online (video call)',
  [InterviewMode.IN_PERSON]: 'In person',
  [InterviewMode.PHONE]: 'Phone call',
};

export type InterviewEmailData = {
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string | null;
  scheduledAt: Date;
  durationMinutes: number;
  mode: InterviewMode;
  meetingLink: string | null;
  location: string | null;
  message: string | null;
  interviewerNames: string[];
  /** Who scheduled it — signs the candidate email. */
  senderName: string;
};

export type RenderedEmail = { subject: string; html: string; text: string };

export type InterviewEmailKind = 'INVITE' | 'RESCHEDULE' | 'CANCEL';

function detailRows(data: InterviewEmailData, forStaff: boolean): EmailDetailRow[] {
  const rows: EmailDetailRow[] = [
    { label: 'Date', value: formatInterviewDate(data.scheduledAt) },
    {
      label: 'Time',
      value: `${formatInterviewTime(data.scheduledAt)} (${data.durationMinutes} minutes)`,
    },
    { label: 'Format', value: MODE_LABEL[data.mode] },
  ];
  if (data.mode === InterviewMode.ONLINE && data.meetingLink) {
    rows.push({ label: 'Meeting link', value: data.meetingLink, href: data.meetingLink });
  }
  if (data.mode === InterviewMode.IN_PERSON && data.location) {
    rows.push({ label: 'Location', value: data.location });
  }
  if (data.mode === InterviewMode.PHONE) {
    rows.push({
      label: 'Phone',
      value: forStaff
        ? (data.candidatePhone ?? 'No number on file — check with the candidate')
        : `We will call you${data.candidatePhone ? ` on ${data.candidatePhone}` : ''}`,
    });
  }
  if (forStaff) {
    rows.unshift({ label: 'Candidate', value: `${data.candidateName} (${data.candidateEmail})` });
  } else if (data.interviewerNames.length) {
    rows.push({ label: 'Interviewer(s)', value: data.interviewerNames.join(', ') });
  }
  return rows;
}

function detailText(rows: EmailDetailRow[]): string {
  return rows.map((row) => `${row.label}: ${row.value}`).join('\n');
}

/** The email the candidate receives. */
export function renderCandidateEmail(
  kind: InterviewEmailKind,
  data: InterviewEmailData,
  cancelReason?: string | null,
): RenderedEmail {
  const firstName = data.candidateName.split(' ')[0] || data.candidateName;
  const rows = detailRows(data, false);
  const when = `${formatInterviewDate(data.scheduledAt)} at ${formatInterviewTime(data.scheduledAt)}`;

  const intro: Record<InterviewEmailKind, string> = {
    INVITE: `Thank you for your interest in joining ${BRAND.name}. We were impressed by your application and would like to invite you to an interview.`,
    RESCHEDULE: `Please note that your interview with ${BRAND.name} has been rescheduled. The updated details are below.`,
    CANCEL: `We are writing to let you know that your interview with ${BRAND.name}, planned for ${when}, has been cancelled.`,
  };
  const subject: Record<InterviewEmailKind, string> = {
    INVITE: `Interview invitation — ${BRAND.name}`,
    RESCHEDULE: `Interview rescheduled — ${BRAND.name}`,
    CANCEL: `Interview cancelled — ${BRAND.name}`,
  };
  const heading: Record<InterviewEmailKind, string> = {
    INVITE: 'You are invited to an interview',
    RESCHEDULE: 'Your interview has been rescheduled',
    CANCEL: 'Your interview has been cancelled',
  };
  const badge: Record<InterviewEmailKind, { label: string; color: string }> = {
    INVITE: { label: 'Interview invitation', color: BRAND.blue },
    RESCHEDULE: { label: 'Updated time', color: '#b76e00' },
    CANCEL: { label: 'Cancelled', color: '#b71d18' },
  };

  const parts: string[] = [
    `<p style="margin:0 0 14px;">Dear ${escapeHtml(firstName)},</p>`,
    `<p style="margin:0 0 18px;">${escapeHtml(intro[kind])}</p>`,
  ];
  const textParts: string[] = [`Dear ${firstName},`, '', intro[kind], ''];

  if (kind !== 'CANCEL') {
    parts.push(detailsTable(rows));
    textParts.push(detailText(rows), '');
    if (data.mode === InterviewMode.ONLINE && data.meetingLink) {
      parts.push(button('Join the interview', data.meetingLink));
    }
    if (data.message?.trim()) {
      parts.push(
        `<div style="border-left:3px solid ${BRAND.green};padding:4px 0 4px 14px;margin:0 0 18px;color:${BRAND.text};">${textToHtml(data.message)}</div>`,
      );
      textParts.push(data.message.trim(), '');
    }
    const tips =
      data.mode === InterviewMode.ONLINE
        ? 'Please join a few minutes early and check that your camera and microphone work. A calendar invite is attached — you can add it to your calendar in one click.'
        : data.mode === InterviewMode.IN_PERSON
          ? 'Please arrive 10 minutes early and bring a copy of your CV and a photo ID. A calendar invite is attached for your convenience.'
          : 'Please keep your phone nearby at the scheduled time. A calendar invite is attached for your convenience.';
    parts.push(`<p style="margin:0 0 14px;">${escapeHtml(tips)}</p>`);
    parts.push(
      `<p style="margin:0 0 14px;">If this time doesn't work for you, simply reply to this email and we will find another slot.</p>`,
    );
    textParts.push(
      tips,
      '',
      "If this time doesn't work for you, reply to this email and we will find another slot.",
      '',
    );
  } else {
    if (cancelReason?.trim()) {
      parts.push(
        `<p style="margin:0 0 14px;"><strong>Reason:</strong> ${escapeHtml(cancelReason.trim())}</p>`,
      );
      textParts.push(`Reason: ${cancelReason.trim()}`, '');
    }
    parts.push(
      `<p style="margin:0 0 14px;">We apologise for any inconvenience. If you have any questions, please reply to this email.</p>`,
    );
    textParts.push(
      'We apologise for any inconvenience. If you have any questions, please reply to this email.',
      '',
    );
  }

  parts.push(
    `<p style="margin:18px 0 0;">Kind regards,<br><strong>${escapeHtml(data.senderName)}</strong><br><span style="color:${BRAND.muted};">Human Resources, ${BRAND.name}</span></p>`,
  );
  textParts.push('Kind regards,', data.senderName, `Human Resources, ${BRAND.name}`);

  return {
    subject: subject[kind],
    html: renderEmailLayout({
      preheader:
        kind === 'CANCEL' ? `Your interview on ${when} is cancelled.` : `Interview on ${when}.`,
      heading: heading[kind],
      badge: badge[kind],
      bodyHtml: parts.join(''),
    }),
    text: textParts.join('\n'),
  };
}

/** The internal copy the interviewers receive. */
export function renderInterviewerEmail(
  kind: InterviewEmailKind,
  data: InterviewEmailData,
  cancelReason?: string | null,
): RenderedEmail {
  const rows = detailRows(data, true);
  const verb =
    kind === 'INVITE' ? 'scheduled' : kind === 'RESCHEDULE' ? 'rescheduled' : 'cancelled';
  const subject = `Interview ${verb}: ${data.candidateName} — ${formatInterviewDate(data.scheduledAt)}, ${formatInterviewTime(data.scheduledAt)}`;
  const intro = `An interview you are on has been ${verb} by ${data.senderName}.`;

  const parts = [`<p style="margin:0 0 18px;">${escapeHtml(intro)}</p>`, detailsTable(rows)];
  const textParts = [intro, '', detailText(rows)];
  if (kind === 'CANCEL' && cancelReason?.trim()) {
    parts.push(
      `<p style="margin:0 0 14px;"><strong>Reason:</strong> ${escapeHtml(cancelReason.trim())}</p>`,
    );
    textParts.push('', `Reason: ${cancelReason.trim()}`);
  }
  if (kind !== 'CANCEL') {
    parts.push(
      `<p style="margin:0 0 14px;">The candidate's CV is on their record in the BNW HR system (Candidates).</p>`,
    );
  }

  return {
    subject,
    html: renderEmailLayout({
      preheader: subject,
      heading: `Interview ${verb}`,
      badge: { label: 'Internal', color: BRAND.muted },
      bodyHtml: parts.join(''),
    }),
    text: textParts.join('\n'),
  };
}
