import { BRAND, button, detailsTable, escapeHtml, renderEmailLayout } from '../mail/email-layout';
import type { RenderedEmailContent } from '../mail/mail.types';
import { formatSalaryMonth } from './salary-calc';

type SalarySlipEmailOptions = {
  employeeName: string;
  firstName: string;
  salaryMonth: string;
  reference: string;
  designation: string | null;
  revision: number;
  link: string;
};

/** Subject: `Salary Slip - September 2026 - Ayesha Khan`. */
export function salarySlipEmailSubject(salaryMonth: string, employeeName: string): string {
  return `Salary Slip - ${formatSalaryMonth(salaryMonth)} - ${employeeName}`;
}

/**
 * The email that carries the salary slip PDF. Amounts are deliberately left out of the body —
 * they're in the attachment, and inboxes get forwarded / previewed on lock screens.
 */
export function renderSalarySlipEmail(options: SalarySlipEmailOptions): RenderedEmailContent {
  const month = formatSalaryMonth(options.salaryMonth);
  const revised = options.revision > 1;
  const intro = revised
    ? `Please find attached your revised salary slip for ${month}. It replaces the copy sent to you earlier.`
    : `Please find attached your salary slip for ${month}.`;
  const rows = [
    { label: 'Salary month', value: month },
    { label: 'Slip number', value: options.reference },
    ...(options.designation ? [{ label: 'Designation', value: options.designation }] : []),
    { label: 'Attachment', value: 'Salary slip (PDF)' },
  ];

  const html = renderEmailLayout({
    preheader: `Your salary slip for ${month} is attached.`,
    heading: `Your salary slip for ${month}`,
    badge: { label: revised ? 'Revised salary slip' : 'Salary slip', color: BRAND.green },
    bodyHtml:
      `<p style="margin:0 0 14px;">Dear ${escapeHtml(options.firstName)},</p>` +
      `<p style="margin:0 0 18px;">${escapeHtml(intro)} It shows your earnings, deductions and net salary for the month.</p>` +
      detailsTable(rows) +
      `<p style="margin:0 0 18px;">You can also view and download all your salary slips in the BNW HR system at any time.</p>` +
      button('View my salary slips', options.link) +
      `<p style="margin:0 0 14px;">If anything on your salary slip looks incorrect, please reply to this email or contact the HR department.</p>` +
      `<p style="margin:0 0 6px;">Kind regards,<br>HR Department<br>${escapeHtml(BRAND.name)}</p>` +
      `<p style="margin:18px 0 0;color:${BRAND.muted};font-size:12px;">This email and its attachment are confidential and intended only for ${escapeHtml(options.employeeName)}.</p>`,
  });

  const text = [
    `Dear ${options.firstName},`,
    '',
    `${intro} It shows your earnings, deductions and net salary for the month.`,
    '',
    ...rows.map((row) => `${row.label}: ${row.value}`),
    '',
    `View all your salary slips: ${options.link}`,
    '',
    'If anything on your salary slip looks incorrect, please reply to this email or contact the HR department.',
    '',
    'Kind regards,',
    'HR Department',
    BRAND.name,
  ].join('\n');

  return { subject: salarySlipEmailSubject(options.salaryMonth, options.employeeName), html, text };
}
