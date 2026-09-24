/**
 * Minimal hand-rolled CSV writer (no dependency — this is a small dataset for now, per the
 * Sprint 2 task brief). Escapes values containing commas, quotes, or newlines per RFC 4180.
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const lines = [headers.map(escapeCsvValue).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvValue(row[h])).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
