import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PDFDocument, PDFFont, PDFImage, PDFPage, RGB, StandardFonts, rgb } from 'pdf-lib';
import { SalarySlip } from '../entities/salary-slip.entity';
import { formatFormDate } from '../common/pdf/bnw-form-pdf';
import { BRAND } from '../mail/email-layout';
import {
  amountInWords,
  formatSalaryAmount,
  formatSalaryMonth,
  maskAccountNumber,
} from './salary-calc';

const LOGO_PATH = join(process.cwd(), 'assets', 'email', 'bnw-logo.png');

const hex = (value: string): RGB =>
  rgb(
    parseInt(value.slice(1, 3), 16) / 255,
    parseInt(value.slice(3, 5), 16) / 255,
    parseInt(value.slice(5, 7), 16) / 255,
  );

const COLORS = {
  blue: hex(BRAND.blue),
  green: hex(BRAND.green),
  text: hex(BRAND.text),
  muted: hex(BRAND.muted),
  border: hex('#d7dce1'),
  headerFill: hex('#eef2fd'),
  zebra: hex('#f8f9fb'),
  netFill: hex('#e9f8ec'),
  netBorder: hex('#3cc83c'),
  white: rgb(1, 1, 1),
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

type Fonts = { regular: PDFFont; bold: PDFFont };

/**
 * A salary slip as a one-page A4 PDF: BNW logo header, employee details, earnings and deductions
 * side by side, net salary (with the amount in words) and payment information. pdf-lib standard
 * fonts, so text outside WinAnsi is replaced with '?' rather than throwing.
 */
@Injectable()
export class SalarySlipPdfService {
  private readonly logger = new Logger(SalarySlipPdfService.name);
  private logoBytes: Buffer | null | undefined;

  async render(slip: SalarySlip): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const monthLabel = formatSalaryMonth(slip.salaryMonth);
    doc.setTitle(`Salary Slip - ${monthLabel} - ${slip.employeeName}`);
    doc.setAuthor(BRAND.name);
    doc.setSubject(`Salary slip for ${monthLabel}`);
    doc.setCreator('BNW OMS');

    const fonts: Fonts = {
      regular: await doc.embedFont(StandardFonts.Helvetica),
      bold: await doc.embedFont(StandardFonts.HelveticaBold),
    };
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const draw = new Painter(page, fonts);
    const logo = await this.embedLogo(doc);

    // --- Header -------------------------------------------------------------------------------
    let y = PAGE_HEIGHT - MARGIN;
    if (logo) {
      const width = 150;
      const height = (logo.height / logo.width) * width;
      page.drawImage(logo, { x: MARGIN, y: y - height, width, height });
    } else {
      draw.text('BNW', MARGIN, y - 22, { size: 24, font: fonts.bold, color: COLORS.green });
      draw.text('CHARTERED ACCOUNTANTS', MARGIN, y - 34, { size: 7, color: COLORS.blue });
    }
    draw.text('SALARY SLIP', MARGIN, y - 20, {
      size: 20,
      font: fonts.bold,
      color: COLORS.blue,
      align: 'right',
      width: CONTENT_WIDTH,
    });
    draw.text(`For the month of ${monthLabel}`, MARGIN, y - 36, {
      size: 10,
      color: COLORS.muted,
      align: 'right',
      width: CONTENT_WIDTH,
    });
    draw.text(BRAND.name, MARGIN, y - 50, {
      size: 9,
      font: fonts.bold,
      align: 'right',
      width: CONTENT_WIDTH,
    });
    y -= 66;

    // Brand bar: blue then green.
    page.drawRectangle({ x: MARGIN, y, width: CONTENT_WIDTH * 0.7, height: 4, color: COLORS.blue });
    page.drawRectangle({
      x: MARGIN + CONTENT_WIDTH * 0.7,
      y,
      width: CONTENT_WIDTH * 0.3,
      height: 4,
      color: COLORS.green,
    });
    y -= 18;

    const reference = `SS-${String(slip.id).padStart(6, '0')}${slip.revision > 1 ? ` (Revision ${slip.revision})` : ''}`;
    draw.text(`Slip No: ${reference}`, MARGIN, y, { size: 8.5, color: COLORS.muted });
    draw.text(`Generated on ${formatFormDate(slip.createdAt)}`, MARGIN, y, {
      size: 8.5,
      color: COLORS.muted,
      align: 'right',
      width: CONTENT_WIDTH,
    });
    y -= 16;

    // --- Employee details ---------------------------------------------------------------------
    y = draw.sectionTitle('Employee Details', y);
    const details: [string, string][] = [
      ['Employee Name', slip.employeeName],
      ['Employee ID', slip.employeeCode ?? '—'],
      ['Designation', slip.designation ?? '—'],
      ['Department', slip.departmentName ?? '—'],
      ['Salary Month', monthLabel],
      ['Working Days', slip.workingDays !== null ? String(slip.workingDays) : '—'],
    ];
    y = draw.detailsGrid(details, y);
    y -= 18;

    // --- Earnings / deductions ----------------------------------------------------------------
    const earnings: [string, number][] = [
      ['Basic Salary', slip.basicSalary],
      ...slip.allowances.map((item): [string, number] => [item.label, item.amount]),
      ['Bonus', slip.bonus],
      ['Overtime', slip.overtime],
    ];
    const deductions: [string, number][] = [
      ...slip.deductions.map((item): [string, number] => [item.label, item.amount]),
      ['Income Tax', slip.tax],
    ];
    const gap = 14;
    const columnWidth = (CONTENT_WIDTH - gap) / 2;
    const rows = Math.max(earnings.length, deductions.length);
    const tableBottom = draw.amountTable(
      'Earnings',
      earnings,
      rows,
      ['Gross Salary', slip.grossSalary],
      MARGIN,
      y,
      columnWidth,
    );
    draw.amountTable(
      'Deductions',
      deductions,
      rows,
      ['Total Deductions', slip.totalDeductions],
      MARGIN + columnWidth + gap,
      y,
      columnWidth,
    );
    y = tableBottom - 18;

    // --- Net salary ---------------------------------------------------------------------------
    const words = draw.wrap(amountInWords(slip.netSalary), fonts.regular, 8.5, CONTENT_WIDTH - 32);
    const netHeight = 44 + words.length * 11;
    page.drawRectangle({
      x: MARGIN,
      y: y - netHeight,
      width: CONTENT_WIDTH,
      height: netHeight,
      color: COLORS.netFill,
      borderColor: COLORS.netBorder,
      borderWidth: 1,
    });
    draw.text('NET SALARY', MARGIN + 16, y - 24, { size: 11, font: fonts.bold });
    draw.text('(Gross Salary - Total Deductions)', MARGIN + 92, y - 24, {
      size: 8,
      color: COLORS.muted,
    });
    draw.text(formatSalaryAmount(slip.netSalary), MARGIN, y - 26, {
      size: 18,
      font: fonts.bold,
      color: COLORS.blue,
      align: 'right',
      width: CONTENT_WIDTH - 16,
    });
    words.forEach((line, i) => {
      draw.text(line, MARGIN + 16, y - 42 - i * 11, { size: 8.5, color: COLORS.text });
    });
    y -= netHeight + 18;

    // --- Payment information ------------------------------------------------------------------
    y = draw.sectionTitle('Payment Information', y);
    y = draw.detailsGrid(
      [
        ['Payment Method', slip.paymentMethod ?? '—'],
        ['Payment Date', slip.paymentDate ? formatFormDate(slip.paymentDate) : '—'],
        ['Bank Name', slip.bankName ?? '—'],
        ['Account Number', maskAccountNumber(slip.bankAccountNumber) ?? '—'],
      ],
      y,
    );

    if (slip.notes) {
      y -= 16;
      y = draw.sectionTitle('Notes', y);
      for (const line of draw.wrap(slip.notes, fonts.regular, 9, CONTENT_WIDTH - 12).slice(0, 6)) {
        y -= 12;
        draw.text(line, MARGIN + 6, y, { size: 9 });
      }
    }

    // --- Footer -------------------------------------------------------------------------------
    const footerY = MARGIN + 10;
    page.drawLine({
      start: { x: MARGIN, y: footerY + 16 },
      end: { x: PAGE_WIDTH - MARGIN, y: footerY + 16 },
      thickness: 0.5,
      color: COLORS.border,
    });
    draw.text(
      'This is a computer-generated salary slip and does not require a signature.',
      MARGIN,
      footerY,
      { size: 8, color: COLORS.muted },
    );
    draw.text(`${BRAND.name}  |  Private & Confidential`, MARGIN, footerY, {
      size: 8,
      color: COLORS.muted,
      align: 'right',
      width: CONTENT_WIDTH,
    });

    return doc.save();
  }

  private async embedLogo(doc: PDFDocument): Promise<PDFImage | null> {
    if (this.logoBytes === undefined) {
      this.logoBytes = existsSync(LOGO_PATH) ? readFileSync(LOGO_PATH) : null;
    }
    if (!this.logoBytes) return null;
    try {
      return await doc.embedPng(this.logoBytes);
    } catch (error) {
      this.logger.warn(`Could not embed the logo: ${(error as Error).message}`);
      return null;
    }
  }
}

type TextOpts = {
  size?: number;
  font?: PDFFont;
  color?: RGB;
  align?: 'left' | 'right' | 'center';
  width?: number;
};

/** Small drawing helpers for the one-page slip layout. */
class Painter {
  private readonly charsets = new Map<PDFFont, Set<number>>();

  constructor(
    private readonly page: PDFPage,
    private readonly fonts: Fonts,
  ) {}

  safe(font: PDFFont, value: string): string {
    let charset = this.charsets.get(font);
    if (!charset) {
      charset = new Set(font.getCharacterSet());
      this.charsets.set(font, charset);
    }
    // Swap the em/en dashes we use as "empty" for a plain hyphen when the font lacks them.
    return Array.from(value, (ch) => {
      if (charset!.has(ch.codePointAt(0)!)) return ch;
      return ch === '—' || ch === '–' ? '-' : '?';
    }).join('');
  }

  /** Cut `value` with an ellipsis so it fits in `maxWidth`. */
  fit(value: string, font: PDFFont, size: number, maxWidth: number): string {
    let text = this.safe(font, value);
    if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
    while (text.length > 1 && font.widthOfTextAtSize(`${text}...`, size) > maxWidth) {
      text = text.slice(0, -1);
    }
    return `${text.trimEnd()}...`;
  }

  wrap(value: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const lines: string[] = [];
    for (const paragraph of value.split(/\r?\n/)) {
      let line = '';
      for (const word of this.safe(font, paragraph).split(/ +/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  text(value: string, x: number, y: number, opts: TextOpts = {}): void {
    const font = opts.font ?? this.fonts.regular;
    const size = opts.size ?? 9;
    const content = opts.width ? this.fit(value, font, size, opts.width) : this.safe(font, value);
    const width = font.widthOfTextAtSize(content, size);
    const left =
      opts.align === 'right' && opts.width
        ? x + opts.width - width
        : opts.align === 'center' && opts.width
          ? x + (opts.width - width) / 2
          : x;
    this.page.drawText(content, { x: left, y, size, font, color: opts.color ?? COLORS.text });
  }

  /** Blue section label with a hairline under it; returns the y below it. */
  sectionTitle(title: string, y: number): number {
    this.text(title.toUpperCase(), MARGIN, y - 10, {
      size: 9,
      font: this.fonts.bold,
      color: COLORS.blue,
    });
    this.page.drawLine({
      start: { x: MARGIN, y: y - 15 },
      end: { x: PAGE_WIDTH - MARGIN, y: y - 15 },
      thickness: 0.6,
      color: COLORS.border,
    });
    return y - 19;
  }

  /** Label/value pairs in two columns. */
  detailsGrid(items: [string, string][], y: number): number {
    const rowHeight = 20;
    const columnWidth = CONTENT_WIDTH / 2;
    const labelWidth = 92;
    items.forEach(([label, value], i) => {
      const x = MARGIN + (i % 2) * columnWidth;
      const rowY = y - Math.floor(i / 2) * rowHeight - 14;
      this.text(label, x + 6, rowY, { size: 8.5, color: COLORS.muted });
      this.text(value, x + 6 + labelWidth, rowY, {
        size: 9,
        font: this.fonts.bold,
        width: columnWidth - labelWidth - 16,
      });
    });
    return y - Math.ceil(items.length / 2) * rowHeight - 4;
  }

  /** An amount table with a shaded header, `rows` body rows (padded) and a total row. */
  amountTable(
    title: string,
    items: [string, number][],
    rows: number,
    total: [string, number],
    x: number,
    y: number,
    width: number,
  ): number {
    const headerHeight = 22;
    const rowHeight = 18;
    const amountWidth = 100;
    const pad = 8;
    const height = headerHeight + rows * rowHeight + headerHeight;
    const { bold } = this.fonts;

    this.page.drawRectangle({
      x,
      y: y - headerHeight,
      width,
      height: headerHeight,
      color: COLORS.blue,
    });
    this.text(title, x + pad, y - 15, { size: 9.5, font: bold, color: COLORS.white });
    this.text('Amount', x, y - 15, {
      size: 9.5,
      font: bold,
      color: COLORS.white,
      align: 'right',
      width: width - pad,
    });

    for (let i = 0; i < rows; i += 1) {
      const top = y - headerHeight - i * rowHeight;
      if (i % 2 === 1) {
        this.page.drawRectangle({
          x,
          y: top - rowHeight,
          width,
          height: rowHeight,
          color: COLORS.zebra,
        });
      }
      const item = items[i];
      if (item) {
        this.text(item[0], x + pad, top - 12.5, { size: 9, width: width - amountWidth - pad * 2 });
        this.text(formatSalaryAmount(item[1]), x, top - 12.5, {
          size: 9,
          align: 'right',
          width: width - pad,
        });
      }
    }

    const totalTop = y - headerHeight - rows * rowHeight;
    this.page.drawRectangle({
      x,
      y: totalTop - headerHeight,
      width,
      height: headerHeight,
      color: COLORS.headerFill,
    });
    this.text(total[0], x + pad, totalTop - 14.5, { size: 9.5, font: bold });
    this.text(formatSalaryAmount(total[1]), x, totalTop - 14.5, {
      size: 9.5,
      font: bold,
      align: 'right',
      width: width - pad,
    });

    this.page.drawRectangle({
      x,
      y: y - height,
      width,
      height,
      borderColor: COLORS.border,
      borderWidth: 0.75,
    });
    return y - height;
  }
}
