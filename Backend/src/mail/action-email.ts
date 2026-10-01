import {
  BRAND,
  button,
  escapeHtml,
  detailsTable,
  EmailDetailRow,
  renderEmailLayout,
} from './email-layout';
import type { RenderedEmailContent } from './mail.types';

type ActionEmailOptions = {
  subject: string;
  heading: string;
  /** Plain text — escaped. */
  intro: string;
  rows?: EmailDetailRow[];
  /** Absolute URL into the app (MailService.appUrl). */
  link: string;
  buttonLabel: string;
  badge?: { label: string; color: string };
};

/**
 * A short "something needs your attention / here's the outcome" email with a details box and a
 * button that opens the item in the BNW app. Used for workflow updates (work orders, …).
 */
export function renderActionEmail(options: ActionEmailOptions): RenderedEmailContent {
  const rows = options.rows ?? [];
  const html = renderEmailLayout({
    preheader: options.intro,
    heading: options.heading,
    badge: options.badge ?? { label: 'BNW HR system', color: BRAND.blue },
    bodyHtml:
      `<p style="margin:0 0 18px;">${escapeHtml(options.intro)}</p>` +
      (rows.length ? detailsTable(rows) : '') +
      button(options.buttonLabel, options.link) +
      `<p style="margin:0;color:${BRAND.muted};font-size:13px;">Or open this link: <a href="${escapeHtml(options.link)}" style="color:${BRAND.blue};">${escapeHtml(options.link)}</a></p>`,
  });
  const text = [
    options.intro,
    '',
    ...rows.map((row) => `${row.label}: ${row.value}`),
    '',
    `${options.buttonLabel}: ${options.link}`,
  ].join('\n');
  return { subject: options.subject, html, text };
}
