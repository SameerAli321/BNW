import { EMAIL_LOGO_CID } from './mail.service';

/** Escape user-entered text before putting it into an email's HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Plain text → HTML paragraphs, keeping the line breaks someone typed. */
export function textToHtml(value: string): string {
  return value
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 14px;">${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export const BRAND = {
  name: 'BNW Chartered Accountants',
  blue: '#1b3fd8',
  green: '#3cc83c',
  text: '#1c252e',
  muted: '#637381',
  border: '#e5e8eb',
  background: '#f4f6f8',
};

export type EmailDetailRow = { label: string; value: string; href?: string };

/** A two-column "label | value" box (e.g. interview date / time / link). Values are escaped. */
export function detailsTable(rows: EmailDetailRow[]): string {
  const cells = rows
    .map(
      (row) => `
        <tr>
          <td style="padding:10px 16px;color:${BRAND.muted};font-size:13px;width:130px;vertical-align:top;">${escapeHtml(row.label)}</td>
          <td style="padding:10px 16px;color:${BRAND.text};font-size:14px;font-weight:600;vertical-align:top;word-break:break-word;">${
            row.href
              ? `<a href="${escapeHtml(row.href)}" style="color:${BRAND.blue};text-decoration:none;">${escapeHtml(row.value)}</a>`
              : escapeHtml(row.value)
          }</td>
        </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${BRAND.border};border-radius:10px;border-collapse:separate;background:#fafbfc;margin:4px 0 20px;">${cells}</table>`;
}

/** A big call-to-action button. */
export function button(label: string, href: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:6px 0 22px;">
      <tr><td style="border-radius:8px;background:${BRAND.blue};">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 26px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
      </td></tr>
    </table>`;
}

type LayoutOptions = {
  /** Hidden preview line shown next to the subject in inbox lists. */
  preheader: string;
  heading: string;
  /** Pre-built, already-escaped HTML. */
  bodyHtml: string;
  /** Optional coloured pill above the heading, e.g. "Interview invitation". */
  badge?: { label: string; color: string };
};

/**
 * The BNW email shell: logo header, white card, footer. Table-based with inline styles because
 * that's what renders consistently in Gmail / Outlook / Apple Mail.
 */
export function renderEmailLayout({ preheader, heading, bodyHtml, badge }: LayoutOptions): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.background};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.text};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.background};">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;">
        <tr><td style="padding:0 4px 18px;" align="left">
          <img src="cid:${EMAIL_LOGO_CID}" alt="${BRAND.name}" width="170" style="display:block;border:0;height:auto;">
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(145,158,171,0.16);">
          <div style="height:5px;background:linear-gradient(90deg,${BRAND.blue},${BRAND.green});background-color:${BRAND.blue};"></div>
          <div style="padding:32px 32px 12px;">
            ${
              badge
                ? `<span style="display:inline-block;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;color:${badge.color};background:${badge.color}1a;margin-bottom:14px;">${escapeHtml(badge.label)}</span>`
                : ''
            }
            <h1 style="margin:0 0 18px;font-size:22px;line-height:1.35;color:${BRAND.text};">${escapeHtml(heading)}</h1>
            <div style="font-size:15px;line-height:1.65;color:${BRAND.text};">${bodyHtml}</div>
          </div>
        </td></tr>
        <tr><td style="padding:20px 8px;text-align:center;color:${BRAND.muted};font-size:12px;line-height:1.6;">
          ${BRAND.name}<br>
          This email was sent by BNW's HR system. Please reply to this email if you have any questions.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
