import { randomUUID } from 'crypto';
import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';
import { Injectable } from '@nestjs/common';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { Letter } from '../entities/letter.entity';
import { LetterTemplate, LetterFieldSchemaEntry } from '../entities/letter-template.entity';
import { Signature } from '../entities/signature.entity';
import { User } from '../entities/user.entity';
import { EmployeeProfile } from '../entities/employee-profile.entity';
import { RoleName } from '../common/enums/role.enum';
import { Gender } from '../common/enums/gender.enum';
import { ensureLettersDirExists, LETTERS_DIR } from './letter-pdf.storage';

const COMPANY_NAME = 'BNW Consultants (SMC-PRIVATE) Limited';

// Letterhead, as on the owner-supplied company letters (logo + contacts, green/blue rule, website
// and green address bar footer on every page).
const LETTERHEAD_MARK_PATH = join(process.cwd(), 'assets', 'letterhead', 'bnw-mark.png');
const LETTERHEAD = {
  subtitle: 'CONSULTANTS (SMC-PRIVATE) LIMITED',
  contacts: ['+92 51 2723510', '+44 20 8648 0800', 'info@bnwconsultants.com'],
  website: 'www.bnwconsultants.com',
  address: '427, Street 5/2, Block D, National Police Foundation, O9 PWD, Islamabad',
};
const BRAND_GREEN = rgb(0.42, 0.76, 0.27);
const BRAND_BLUE = rgb(0.11, 0.38, 0.72);

// Keys resolvable from the subject User — usable as `{{key}}` in any template body, whether or not
// the template lists them in fieldsSchema.
const AUTO_FIELD_KEYS = [
  'employee.fullName',
  'employee.firstName',
  'employee.lastName',
  'employee.designation',
  'employee.email',
  'employee.employeeCode',
  'employee.department',
  'employee.joinDate',
  'employee.cnic',
  'employee.relation',
  'employee.he',
  'employee.He',
  'employee.his',
  'employee.His',
  'employee.him',
  'employee.title',
];

// Gendered wording from the E-record profile; unknown/unset gender keeps the letter's "he/she".
const GENDERED: Record<string, { MALE: string; FEMALE: string; fallback: string }> = {
  'employee.relation': { MALE: 'Son', FEMALE: 'Daughter', fallback: 'Son/Daughter' },
  'employee.he': { MALE: 'he', FEMALE: 'she', fallback: 'he/she' },
  'employee.He': { MALE: 'He', FEMALE: 'She', fallback: 'He/She' },
  'employee.his': { MALE: 'his', FEMALE: 'her', fallback: 'his/her' },
  'employee.His': { MALE: 'His', FEMALE: 'Her', fallback: 'His/Her' },
  'employee.him': { MALE: 'him', FEMALE: 'her', fallback: 'him/her' },
  'employee.title': { MALE: 'Mr.', FEMALE: 'Ms.', fallback: 'Mr./Ms.' },
};

/** 'YYYY-MM-DD' -> "5 July 2024"; anything unparseable is returned as-is. */
function formatDateOnly(value: string | null): string {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : formatLetterDate(date);
}

/**
 * Resolves an auto-filled field's value from the subject User entity (and their E-record profile,
 * for CNIC and gendered wording). Per docs/API_CONTRACT_SPRINT3.md, auto-fields pull from the
 * employee record (e.g. `employee.fullName`, `employee.designation`) and are never stored in
 * `letters.fieldValues` — they're resolved fresh at render time so they always reflect the
 * current user record.
 */
function resolveAutoFieldValue(
  key: string,
  subject: User,
  profile: EmployeeProfile | null = null,
): string {
  const gendered = GENDERED[key];
  if (gendered) {
    const gender = profile?.gender;
    return gender === Gender.MALE || gender === Gender.FEMALE
      ? gendered[gender]
      : gendered.fallback;
  }
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
      return formatDateOnly(subject.joinDate);
    case 'employee.cnic':
      return profile?.nationalId ?? '';
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
  profile: EmployeeProfile | null = null,
): Array<{ key: string; label: string; value: string }> {
  return fieldsSchema.map((entry) => ({
    key: entry.key,
    label: entry.label,
    value: entry.autoFilled
      ? resolveAutoFieldValue(entry.key, subject, profile)
      : (manualValues[entry.key] ?? ''),
  }));
}

function formatLetterDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Replaces `{{key}}` tokens (and the legacy literal `[Date]`) in a template body. Values are
 * HTML-escaped and their line breaks kept, so free-text fields like `feedback` render as typed. A
 * token with no value renders as a blank line to fill, so gaps are obvious in a preview.
 */
export function fillLetterPlaceholders(bodyHtml: string, values: Record<string, string>): string {
  const toHtml = (key: string) => {
    const value = values[key]?.trim();
    return value ? escapeHtml(value).replace(/\r?\n/g, '<br/>') : '__________';
  };
  return bodyHtml
    .replace(/\[Date\]/g, () => toHtml('date'))
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => toHtml(key));
}

type TextRun = { text: string; bold: boolean; italic: boolean };
type TextBlock = { align: 'left' | 'center' | 'right'; runs: TextRun[] };

function parseInlineRuns(html: string): TextRun[] {
  const runs: TextRun[] = [];
  let bold = 0;
  let italic = 0;
  for (const part of html.split(/(<[^>]+>)/)) {
    if (!part) continue;
    if (part.startsWith('<')) {
      const tag = /^<\s*(\/)?\s*([a-z0-9]+)/i.exec(part);
      if (!tag) continue;
      const delta = tag[1] ? -1 : 1;
      const name = tag[2].toLowerCase();
      if (name === 'strong' || name === 'b') bold = Math.max(0, bold + delta);
      else if (name === 'em' || name === 'i') italic = Math.max(0, italic + delta);
      else if (name === 'br') runs.push({ text: '\n', bold: false, italic: false });
      continue;
    }
    const text = decodeEntities(part.replace(/\s+/g, ' '));
    if (text) runs.push({ text, bold: bold > 0, italic: italic > 0 });
  }
  return runs;
}

/**
 * Minimal HTML -> blocks: one block per `<p>` (honouring `text-align`), with bold/italic/`<br>`
 * inline. Text outside `<p>` tags is split into paragraphs on blank lines, so a plain-text body
 * typed into the template editor still lays out sensibly.
 */
function parseBodyBlocks(html: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  const pushLoose = (text: string) => {
    for (const chunk of text.split(/\r?\n\s*\r?\n/)) {
      if (chunk.replace(/<[^>]+>/g, '').trim()) {
        blocks.push({ align: 'left', runs: parseInlineRuns(chunk.replace(/\r?\n/g, '<br/>')) });
      }
    }
  };
  const paragraphRe = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = paragraphRe.exec(html))) {
    pushLoose(html.slice(last, match.index));
    const align = /text-align\s*:\s*(center|right)/i.exec(match[1])?.[1].toLowerCase();
    blocks.push({
      align: (align as TextBlock['align']) ?? 'left',
      runs: parseInlineRuns(match[2]),
    });
    last = paragraphRe.lastIndex;
  }
  pushLoose(html.slice(last));
  return blocks;
}

/**
 * Renders a letter as an A4 PDF with pdf-lib, per docs/API_CONTRACT_SPRINT3.md scope cut #4 (no
 * puppeteer — headless Chromium is unreliable to provision in a sandboxed build environment).
 * Lays out the template's `bodyHtml` with placeholders filled in, under the company letterhead, then
 * appends the CEO signature block (and the employee's acknowledgement once they've signed).
 * Supports the subset of HTML the templates use: `<p>` (with text-align), `<strong>`/`<b>`,
 * `<em>`/`<i>`, `<br>`.
 */
@Injectable()
export class LetterPdfRendererService {
  /**
   * Renders (or re-renders) a letter's PDF from its current fieldValues and signatures, saves it
   * under uploads/letters/, and returns the path relative to the uploads root (same convention as
   * EmployeeDocument.filePath). `signatures` needs the `signer` relation loaded; `profile` is the
   * subject's E-record profile (CNIC, gender), if they have one.
   */
  async render(
    letter: Letter,
    template: LetterTemplate,
    subject: User,
    signatures: Signature[] = [],
    profile: EmployeeProfile | null = null,
  ): Promise<string> {
    const ceoSignature = signatures.find((s) => s.signerRole === RoleName.CEO) ?? null;
    const employeeSignature =
      signatures.find((s) => s.signerId === letter.subjectUserId && s !== ceoSignature) ?? null;
    const signerName = (s: Signature) =>
      s.signer ? `${s.signer.firstName} ${s.signer.lastName}` : s.signatureText;

    // The letter is dated the day the CEO signs it; until then, today (previews).
    const values: Record<string, string> = {
      date: formatLetterDate(ceoSignature?.signedAt ?? new Date()),
      'company.name': COMPANY_NAME,
      'ceo.name': ceoSignature ? signerName(ceoSignature) : '',
    };
    for (const key of AUTO_FIELD_KEYS) {
      values[key] = resolveAutoFieldValue(key, subject, profile);
    }
    for (const field of resolveLetterFieldValues(
      template.fieldsSchema,
      letter.fieldValues ?? {},
      subject,
      profile,
    )) {
      values[field.key] = field.value;
    }
    const blocks = parseBodyBlocks(fillLetterPlaceholders(template.bodyHtml ?? '', values));

    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(`${template.name} — ${values['employee.fullName']}`);
    // Body in Times, like the owner's letters; the letterhead itself uses Helvetica.
    const fonts = {
      regular: await pdfDoc.embedFont(StandardFonts.TimesRoman),
      bold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
      italic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
      boldItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic),
      signature: await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic),
      headRegular: await pdfDoc.embedFont(StandardFonts.Helvetica),
      headBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    };
    const mark = await pdfDoc.embedPng(await readFile(LETTERHEAD_MARK_PATH));
    const fontFor = (run: { bold: boolean; italic: boolean }) =>
      run.bold
        ? run.italic
          ? fonts.boldItalic
          : fonts.bold
        : run.italic
          ? fonts.italic
          : fonts.regular;

    // Standard fonts are WinAnsi-only; swap anything outside that set rather than throwing.
    const charsets = new Map<PDFFont, Set<number>>();
    const safeText = (font: PDFFont, text: string) => {
      let charset = charsets.get(font);
      if (!charset) {
        charset = new Set(font.getCharacterSet());
        charsets.set(font, charset);
      }
      return Array.from(text, (ch) => (charset!.has(ch.codePointAt(0)!) ? ch : '?')).join('');
    };

    const pageWidth = 595.28; // A4 portrait, points
    const pageHeight = 841.89;
    const margin = 62;
    const contentWidth = pageWidth - margin * 2;
    const contentTop = pageHeight - 150; // below the letterhead rule
    const contentBottom = 125; // above the website line + address bar
    const black = rgb(0, 0, 0);
    const grey = rgb(0.45, 0.45, 0.45);
    const white = rgb(1, 1, 1);

    // Letterhead + footer, drawn on every page.
    const drawLetterhead = (p: PDFPage) => {
      // Logo: round mark, green "BNW", blue company line.
      p.drawImage(mark, { x: margin, y: pageHeight - 94, width: 34, height: 34 });
      p.drawText('BNW', {
        x: margin + 40,
        y: pageHeight - 92,
        size: 40,
        font: fonts.headBold,
        color: BRAND_GREEN,
      });
      p.drawText(LETTERHEAD.subtitle, {
        x: margin,
        y: pageHeight - 104,
        size: 6.6,
        font: fonts.headBold,
        color: BRAND_BLUE,
      });

      // Contacts, top right, each with a small green icon tile.
      const contactX = pageWidth - margin - 170;
      LETTERHEAD.contacts.forEach((line, i) => {
        const lineY = pageHeight - 72 - i * 14.5;
        p.drawRectangle({ x: contactX, y: lineY - 1.5, width: 9, height: 9, color: BRAND_GREEN });
        p.drawText(line, {
          x: contactX + 15,
          y: lineY,
          size: 9.5,
          font: fonts.headRegular,
          color: BRAND_BLUE,
        });
      });

      // Two-tone rule under the header: green, then blue on the right.
      const ruleY = pageHeight - 114;
      const split = margin + contentWidth * 0.62;
      p.drawLine({
        start: { x: margin - 14, y: ruleY },
        end: { x: split, y: ruleY },
        thickness: 3,
        color: BRAND_GREEN,
      });
      p.drawLine({
        start: { x: split, y: ruleY },
        end: { x: pageWidth - margin + 6, y: ruleY },
        thickness: 3,
        color: BRAND_BLUE,
      });

      // Footer: website line, then the rounded green address bar.
      const siteSize = 10.5;
      const siteWidth = fonts.headRegular.widthOfTextAtSize(LETTERHEAD.website, siteSize);
      const siteX = (pageWidth - siteWidth) / 2 + 8;
      p.drawRectangle({ x: siteX - 16, y: 100, width: 10, height: 10, color: BRAND_GREEN });
      p.drawText(LETTERHEAD.website, {
        x: siteX,
        y: 101,
        size: siteSize,
        font: fonts.headRegular,
        color: BRAND_BLUE,
      });

      const barX = margin;
      const barW = contentWidth;
      const barH = 26;
      const barTop = 88; // from the bottom edge
      const r = barH / 2;
      p.drawSvgPath(
        `M ${r} 0 H ${barW - r} A ${r} ${r} 0 0 1 ${barW - r} ${barH} H ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`,
        { x: barX, y: barTop, color: BRAND_GREEN },
      );
      const addrSize = 9.5;
      const addrWidth = fonts.headRegular.widthOfTextAtSize(LETTERHEAD.address, addrSize);
      const addrX = barX + (barW - addrWidth) / 2 + 7;
      const addrY = barTop - barH / 2 - addrSize / 2 + 2.5;
      p.drawRectangle({ x: addrX - 15, y: addrY - 1, width: 9, height: 9, color: white });
      p.drawText(LETTERHEAD.address, {
        x: addrX,
        y: addrY,
        size: addrSize,
        font: fonts.headRegular,
        color: white,
      });
    };

    const addPage = () => {
      const p = pdfDoc.addPage([pageWidth, pageHeight]);
      drawLetterhead(p);
      return p;
    };
    let page: PDFPage = addPage();
    let y = contentTop;

    const ensureSpace = (height: number) => {
      if (y - height < contentBottom) {
        page = addPage();
        y = contentTop;
      }
    };
    const drawSimple = (
      text: string,
      opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb> } = {},
    ) => {
      const font = opts.font ?? fonts.regular;
      const size = opts.size ?? 11;
      ensureSpace(size * 1.5);
      y -= size;
      page.drawText(safeText(font, text), { x: margin, y, size, font, color: opts.color ?? black });
      y -= size * 0.5;
    };

    // Body
    const size = 11.5;
    const lineHeight = 16;
    type Word = { text: string; font: PDFFont; spaceBefore: boolean };
    for (const block of blocks) {
      const lines: Word[][] = [[]];
      let pendingSpace = false;
      for (const run of block.runs) {
        if (run.text === '\n') {
          lines.push([]);
          pendingSpace = false;
          continue;
        }
        const font = fontFor(run);
        for (const piece of run.text.split(/( +)/)) {
          if (!piece) continue;
          if (piece.startsWith(' ')) {
            pendingSpace = true;
            continue;
          }
          const text = safeText(font, piece);
          const line = lines[lines.length - 1];
          const word = { text, font, spaceBefore: pendingSpace && line.length > 0 };
          const lineWidth = line.reduce(
            (w, wd) =>
              w +
              wd.font.widthOfTextAtSize(wd.text, size) +
              (wd.spaceBefore ? wd.font.widthOfTextAtSize(' ', size) : 0),
            0,
          );
          const wordWidth =
            font.widthOfTextAtSize(text, size) +
            (word.spaceBefore ? font.widthOfTextAtSize(' ', size) : 0);
          if (line.length > 0 && lineWidth + wordWidth > contentWidth) {
            lines.push([{ ...word, spaceBefore: false }]);
          } else {
            line.push(word);
          }
          pendingSpace = false;
        }
      }

      for (const line of lines) {
        ensureSpace(lineHeight);
        const width = line.reduce(
          (w, wd) =>
            w +
            wd.font.widthOfTextAtSize(wd.text, size) +
            (wd.spaceBefore ? wd.font.widthOfTextAtSize(' ', size) : 0),
          0,
        );
        let x =
          block.align === 'right'
            ? pageWidth - margin - width
            : block.align === 'center'
              ? margin + (contentWidth - width) / 2
              : margin;
        // Draw each same-font stretch as one string — pdf-lib's measured widths include kerning
        // but drawn text doesn't, so positioning word by word makes words run together.
        let i = 0;
        while (i < line.length) {
          const font = line[i].font;
          if (line[i].spaceBefore) x += font.widthOfTextAtSize(' ', size);
          let text = line[i].text;
          i += 1;
          while (i < line.length && line[i].font === font) {
            text += (line[i].spaceBefore ? ' ' : '') + line[i].text;
            i += 1;
          }
          page.drawText(text, { x, y: y - size, size, font, color: black });
          x += font.widthOfTextAtSize(text, size);
        }
        y -= lineHeight;
      }
      y -= 8; // paragraph spacing
    }

    // CEO signature block — kept together on one page.
    ensureSpace(110);
    if (ceoSignature) {
      drawSimple(ceoSignature.signatureText, {
        font: fonts.signature,
        size: 22,
        color: rgb(0.08, 0.17, 0.45),
      });
    } else {
      y -= 10;
      drawSimple('[Awaiting CEO signature]', { font: fonts.italic, size: 10, color: grey });
    }
    page.drawLine({
      start: { x: margin, y },
      end: { x: margin + 200, y },
      thickness: 0.75,
      color: black,
    });
    y -= 4;
    if (ceoSignature) drawSimple(signerName(ceoSignature), { font: fonts.bold });
    drawSimple('Chief Executive Officer');
    drawSimple(COMPANY_NAME);
    if (ceoSignature) {
      drawSimple(`Digitally signed on ${ceoSignature.signedAt.toUTCString()}`, {
        size: 8,
        color: grey,
      });
    }

    // Employee acknowledgement, once they've signed.
    if (employeeSignature) {
      y -= 20;
      ensureSpace(90);
      drawSimple('Acknowledged and received by', { font: fonts.bold, size: 10 });
      drawSimple(employeeSignature.signatureText, {
        font: fonts.signature,
        size: 18,
        color: rgb(0.08, 0.17, 0.45),
      });
      drawSimple(signerName(employeeSignature), { size: 10 });
      drawSimple(`Digitally signed on ${employeeSignature.signedAt.toUTCString()}`, {
        size: 8,
        color: grey,
      });
    }

    const bytes = await pdfDoc.save();

    ensureLettersDirExists();
    const filename = `${randomUUID()}.pdf`;
    await writeFile(join(LETTERS_DIR, filename), bytes);

    return join('letters', filename);
  }
}
