import { RoleName } from '../common/enums/role.enum';
import { BRAND, button, detailsTable, escapeHtml, renderEmailLayout } from '../mail/email-layout';
import type { RenderedEmailContent } from '../mail/mail.types';

/** How each role is named in the user-creation form (client's wording). */
export const ROLE_LABELS: Record<string, string> = {
  [RoleName.CEO]: 'CEO',
  [RoleName.MANAGER]: 'Team Lead',
  [RoleName.EMPLOYEE]: 'Team Member',
  [RoleName.ADMIN]: 'HR/Admin',
  [RoleName.HR]: 'HR',
  [RoleName.PAYROLL]: 'Payroll',
};

type WelcomeEmailOptions = {
  firstName: string;
  fullName: string;
  email: string;
  /** The password HR set — the user must change it on first sign-in. */
  password: string;
  role: string;
  employeeCode: string | null;
  designation: string | null;
  departmentName: string | null;
  joinDate: string | null;
  signInUrl: string;
};

const formatDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/** "Your BNW account is ready" — sent to the new user's registered email when HR creates them. */
export function renderWelcomeEmail(options: WelcomeEmailOptions): RenderedEmailContent {
  const rows = [
    { label: 'Name', value: options.fullName },
    ...(options.employeeCode ? [{ label: 'Employee code', value: options.employeeCode }] : []),
    ...(options.designation ? [{ label: 'Job title', value: options.designation }] : []),
    ...(options.departmentName ? [{ label: 'Department', value: options.departmentName }] : []),
    { label: 'Role', value: ROLE_LABELS[options.role] ?? options.role },
    ...(options.joinDate
      ? [{ label: 'Date of joining', value: formatDate(options.joinDate) }]
      : []),
  ];
  const loginRows = [
    { label: 'Sign-in page', value: options.signInUrl, href: options.signInUrl },
    { label: 'User ID (email)', value: options.email },
    { label: 'Temporary password', value: options.password },
  ];

  const html = renderEmailLayout({
    preheader: 'Your account on the BNW HR system has been created.',
    heading: 'Your BNW account is ready',
    badge: { label: 'Welcome', color: BRAND.green },
    bodyHtml:
      `<p style="margin:0 0 14px;">Dear ${escapeHtml(options.firstName)},</p>` +
      `<p style="margin:0 0 18px;">Welcome to ${escapeHtml(BRAND.name)}. Your account on the BNW HR system has been created. Here are your details:</p>` +
      detailsTable(rows) +
      `<p style="margin:0 0 10px;font-weight:700;">How to sign in</p>` +
      detailsTable(loginRows) +
      `<p style="margin:0 0 18px;">For your security you will be asked to choose a new password the first time you sign in. Please don't share your password with anyone.</p>` +
      button('Sign in to BNW', options.signInUrl) +
      `<p style="margin:0 0 14px;">In the HR system you can see your letters, salary slips, leave, appraisals and announcements, and submit requests and forms.</p>` +
      `<p style="margin:0 0 6px;">If you have any questions, just reply to this email.</p>` +
      `<p style="margin:0;">Kind regards,<br>HR Department<br>${escapeHtml(BRAND.name)}</p>`,
  });

  const text = [
    `Dear ${options.firstName},`,
    '',
    `Welcome to ${BRAND.name}. Your account on the BNW HR system has been created.`,
    '',
    ...rows.map((row) => `${row.label}: ${row.value}`),
    '',
    'How to sign in',
    ...loginRows.map((row) => `${row.label}: ${row.value}`),
    '',
    "You will be asked to choose a new password the first time you sign in. Please don't share your password with anyone.",
    '',
    'Kind regards,',
    'HR Department',
    BRAND.name,
  ].join('\n');

  return { subject: `Welcome to ${BRAND.name} — your account is ready`, html, text };
}
