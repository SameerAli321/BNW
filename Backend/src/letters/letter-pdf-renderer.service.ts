import { randomUUID } from 'crypto';
import { join } from 'path';
import { writeFile } from 'fs/promises';
import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Letter } from '../entities/letter.entity';
import { LetterTemplate, LetterFieldSchemaEntry } from '../entities/letter-template.entity';
import { User } from '../entities/user.entity';
import { ensureLettersDirExists, LETTERS_DIR } from './letter-pdf.storage';

/**
 * Resolves an auto-filled field's value from the subject User entity. Per
 * docs/API_CONTRACT_SPRINT3.md, auto-fields pull from the employee record (e.g.
 * `employee.fullName`, `employee.designation`) and are never stored in `letters.fieldValues` —
 * they're resolved fresh at render time so they always reflect the current user record.
 */
function resolveAutoFieldValue(key: string, subject: User): string {
  switch (key) {
    case 'employee.fullName':
      return `${subject.firstName} ${subject.lastName}`;
    case 'employee.firstName':
      return subject.firstName;
    case 'employee.lastName':
      return subject.lastName;
    case 'employee.designation':
      return subject.designation ?? '';
    case 'employee.email':
      return subject.email;
    case 'employee.employeeCode':
      return subject.employeeCode ?? '';
    case 'employee.department':
      return subject.department?.name ?? '';
    case 'employee.joinDate':
      return subject.joinDate ?? '';
    default:
      return '';
  }
}

/**
 * Resolves the full set of field values (auto-filled + manual) for a letter, in the template's
 * fieldsSchema order. Used both by rendering and by the signature's documentHash.
 */
export function resolveLetterFieldValues(
  fieldsSchema: LetterFieldSchemaEntry[],
  manualValues: Record<string, string>,
  subject: User,
): Array<{ key: string; label: string; value: string }> {
  return fieldsSchema.map((entry) => ({
    key: entry.key,
    label: entry.label,
    value: entry.autoFilled
      ? resolveAutoFieldValue(entry.key, subject)
      : (manualValues[entry.key] ?? ''),
  }));
}

/**
 * Sprint 3 PDF rendering, per docs/API_CONTRACT_SPRINT3.md scope cut #4: a simple pdf-lib text
 * layout, NOT the guide's puppeteer HTML->PDF pipeline (headless Chromium is unreliable to
 * provision in a sandboxed build environment). It will not look like a polished letterhead
 * document — that's explicitly acceptable for now. Swappable later: swap this service's internals
 * for a puppeteer + real bodyHtml/CSS renderer without changing `letters.pdfPath` or the
 * `GET /letters/:id/pdf` contract.
 */
@Injectable()
export class LetterPdfRendererService {
  /**
   * Renders (or re-renders) a letter's PDF from its current fieldValues, saves it under
   * uploads/letters/, and returns the path relative to the uploads root (same convention as
   * EmployeeDocument.filePath).
   */
  async render(letter: Letter, template: LetterTemplate, subject: User): Promise<string> {
    const resolved = resolveLetterFieldValues(
      template.fieldsSchema,
      letter.fieldValues ?? {},
      subject,
    );

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28; // A4 portrait, points
    const pageHeight = 841.89;
    const margin = 56;
    const lineHeight = 18;
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const drawLine = (text: string, opts: { bold?: boolean; size?: number } = {}) => {
      if (y < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      const size = opts.size ?? 11;
      const maxWidth = pageWidth - margin * 2;
      const usedFont = opts.bold ? boldFont : font;
      // Simple word-wrap so long values don't run off the page.
      const words = text.split(' ');
      let line = '';
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (usedFont.widthOfTextAtSize(candidate, size) > maxWidth && line) {
          page.drawText(line, { x: margin, y, size, font: usedFont, color: rgb(0, 0, 0) });
          y -= lineHeight;
          line = word;
          if (y < margin) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
        } else {
          line = candidate;
        }
      }
      if (line) {
        page.drawText(line, { x: margin, y, size, font: usedFont, color: rgb(0, 0, 0) });
        y -= lineHeight;
      }
    };

    drawLine(`[PLACEHOLDER RENDERING] ${template.name}`, { bold: true, size: 14 });
    y -= 6;
    drawLine(`Letter #${letter.id} — ${template.type}`, { size: 9 });
    drawLine(`Generated: ${new Date().toISOString()}`, { size: 9 });
    y -= 10;
    drawLine(
      'This is a simple placeholder rendering of the field values below, not the final ' +
        'letterhead document. Real template content and layout are a follow-up once the client ' +
        'confirms letter content (see API_CONTRACT_SPRINT3.md scope cut #4).',
      { size: 9 },
    );
    y -= 12;

    for (const field of resolved) {
      drawLine(`${field.label}: ${field.value}`);
    }

    const bytes = await pdfDoc.save();

    ensureLettersDirExists();
    const filename = `${randomUUID()}.pdf`;
    await writeFile(join(LETTERS_DIR, filename), bytes);

    return join('letters', filename);
  }
}
