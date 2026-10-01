import { PDFDocument, PDFFont, PDFPage, RGB, StandardFonts, rgb } from 'pdf-lib';

/**
 * Shared layout for PDFs of BNW's paper HR forms (Complaint Form, Attendance Regularization,
 * Employee Onboarding): the BNW logo on every page, shaded section headers, bordered label/value
 * cells, typed-name signatures in a script face, and an optional footer. A4, pdf-lib standard
 * fonts (WinAnsi only — anything outside that set is replaced with "?" rather than throwing).
 */

// `signature` draws a typed name in a script face, with `value` as a small caption under it.
export type FormCell = { label: string; value?: string | null; signature?: string | null };
export type FormRow = FormCell | { cells: FormCell[] };

export const FORM_COLORS = {
  headerFill: rgb(0.87, 0.85, 0.78),
  border: rgb(0.2, 0.2, 0.2),
  brandGreen: rgb(0.55, 0.78, 0.33),
  brandBlue: rgb(0.25, 0.55, 0.8),
  grey: rgb(0.45, 0.45, 0.45),
  ink: rgb(0.08, 0.17, 0.45),
};

export function formatFormDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const value =
    typeof date === 'string' ? new Date(date.length === 10 ? `${date}T00:00:00` : date) : date;
  if (Number.isNaN(value.getTime())) return String(date);
  return value.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

type TextOpts = {
  size?: number;
  font?: PDFFont;
  color?: RGB;
  align?: 'left' | 'center' | 'right';
  underline?: boolean;
  x?: number;
  width?: number;
};

export class BnwFormPdf {
  static readonly pageWidth = 595.28;
  static readonly pageHeight = 841.89;

  readonly margin = 56;
  readonly contentWidth = BnwFormPdf.pageWidth - 56 * 2;
  readonly size = 9;
  readonly lineHeight = 12;
  readonly pad = 6;

  page!: PDFPage;
  y = 0;
  private readonly pages: PDFPage[] = [];
  private readonly charsets = new Map<PDFFont, Set<number>>();

  private constructor(
    readonly doc: PDFDocument,
    readonly regular: PDFFont,
    readonly bold: PDFFont,
    readonly script: PDFFont,
  ) {}

  static async create(title: string): Promise<BnwFormPdf> {
    const doc = await PDFDocument.create();
    doc.setTitle(title);
    const pdf = new BnwFormPdf(
      doc,
      await doc.embedFont(StandardFonts.Helvetica),
      await doc.embedFont(StandardFonts.HelveticaBold),
      await doc.embedFont(StandardFonts.TimesRomanBoldItalic),
    );
    pdf.newPage();
    return pdf;
  }

  safe(font: PDFFont, text: string): string {
    let charset = this.charsets.get(font);
    if (!charset) {
      charset = new Set(font.getCharacterSet());
      this.charsets.set(font, charset);
    }
    return Array.from(text, (ch) => (charset!.has(ch.codePointAt(0)!) ? ch : '?')).join('');
  }

  wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const lines: string[] = [];
    for (const paragraph of text.split(/\r?\n/).map((part) => this.safe(font, part))) {
      let line = '';
      for (const word of paragraph.split(/ +/)) {
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

  newPage(): void {
    this.page = this.doc.addPage([BnwFormPdf.pageWidth, BnwFormPdf.pageHeight]);
    this.pages.push(this.page);
    this.drawLogo();
    this.y = BnwFormPdf.pageHeight - 80;
  }

  ensureSpace(height: number): void {
    if (this.y - height < this.margin + 30) this.newPage();
  }

  private drawLogo(): void {
    const top = BnwFormPdf.pageHeight - 40;
    const x = this.margin;
    this.page.drawCircle({
      x: x + 7,
      y: top - 7,
      size: 6,
      borderColor: FORM_COLORS.brandBlue,
      borderWidth: 3,
    });
    this.page.drawText('BNW', {
      x: x + 17,
      y: top - 13,
      size: 18,
      font: this.bold,
      color: FORM_COLORS.brandGreen,
    });
    this.page.drawText('CHARTERED ACCOUNTANTS', {
      x,
      y: top - 23,
      size: 5,
      font: this.regular,
      color: FORM_COLORS.brandBlue,
    });
  }

  /** Wrapped text at the current position; moves `y` below it. */
  text(value: string, opts: TextOpts = {}): void {
    const font = opts.font ?? this.regular;
    const size = opts.size ?? this.size;
    const x0 = opts.x ?? this.margin;
    const width = opts.width ?? this.contentWidth;
    for (const line of this.wrap(value, font, size, width)) {
      this.ensureSpace(size + 4);
      const lineWidth = font.widthOfTextAtSize(line, size);
      const x =
        opts.align === 'center'
          ? x0 + (width - lineWidth) / 2
          : opts.align === 'right'
            ? x0 + width - lineWidth
            : x0;
      this.y -= size;
      this.page.drawText(line, { x, y: this.y, size, font, color: opts.color ?? rgb(0, 0, 0) });
      if (opts.underline) {
        this.page.drawLine({
          start: { x, y: this.y - 1.5 },
          end: { x: x + lineWidth, y: this.y - 1.5 },
          thickness: 0.6,
        });
      }
      this.y -= size * 0.45;
    }
  }

  gap(points: number): void {
    this.y -= points;
  }

  /** Full-width horizontal rule. */
  rule(thickness = 1.2): void {
    this.page.drawLine({
      start: { x: this.margin - 20, y: this.y },
      end: { x: BnwFormPdf.pageWidth - this.margin + 20, y: this.y },
      thickness,
    });
  }

  // Measured width + a fixed gap: pdf-lib's kerned widths leave a trailing space too narrow.
  private labelWidthOf(label: string): number {
    return this.bold.widthOfTextAtSize(this.safe(this.bold, label), this.size) + 4;
  }

  private cellHeight(cell: FormCell, width: number, labelWidth: number): number {
    if (cell.signature) return 44;
    const lines = cell.value
      ? this.wrap(cell.value, this.regular, this.size, width - this.pad * 2 - labelWidth)
      : [''];
    return Math.max(26, lines.length * this.lineHeight + 14);
  }

  private drawBox(x: number, width: number, height: number, fill?: RGB): void {
    this.page.drawRectangle({
      x,
      y: this.y - height,
      width,
      height,
      color: fill,
      borderColor: FORM_COLORS.border,
      borderWidth: 0.75,
    });
  }

  private drawValue(cell: FormCell, x: number, width: number): void {
    const textY = this.y - 8 - this.size;
    if (cell.signature) {
      this.page.drawText(this.safe(this.script, cell.signature), {
        x,
        y: textY - 2,
        size: 14,
        font: this.script,
        color: FORM_COLORS.ink,
      });
      if (cell.value) {
        this.page.drawText(this.safe(this.regular, cell.value), {
          x,
          y: textY - 16,
          size: 7,
          font: this.regular,
          color: FORM_COLORS.grey,
        });
      }
    } else if (cell.value) {
      this.wrap(cell.value, this.regular, this.size, width).forEach((line, i) => {
        this.page.drawText(line, {
          x,
          y: textY - i * this.lineHeight,
          size: this.size,
          font: this.regular,
        });
      });
    }
  }

  /** A section with a shaded, centred title bar and "Label: value" rows (Complaint/Onboarding style). */
  section(title: string, rows: FormRow[]): void {
    const headerHeight = 30;
    this.ensureSpace(headerHeight + 26);
    this.drawBox(this.margin, this.contentWidth, headerHeight, FORM_COLORS.headerFill);
    const titleWidth = this.bold.widthOfTextAtSize(title, this.size);
    this.page.drawText(title, {
      x: this.margin + (this.contentWidth - titleWidth) / 2,
      y: this.y - headerHeight / 2 - this.size / 2 + 2,
      size: this.size,
      font: this.bold,
    });
    this.y -= headerHeight;

    for (const row of rows) {
      const cells = 'cells' in row ? row.cells : [row];
      const width = this.contentWidth / cells.length;
      const height = Math.max(
        ...cells.map((cell) => this.cellHeight(cell, width, this.labelWidthOf(cell.label))),
      );
      this.ensureSpace(height);
      cells.forEach((cell, i) => {
        const x = this.margin + i * width;
        this.drawBox(x, width, height);
        this.page.drawText(this.safe(this.bold, cell.label), {
          x: x + this.pad,
          y: this.y - 8 - this.size,
          size: this.size,
          font: this.bold,
        });
        const labelWidth = this.labelWidthOf(cell.label);
        this.drawValue(cell, x + this.pad + labelWidth, width - this.pad * 2 - labelWidth);
      });
      this.y -= height;
    }
    this.y -= 24;
  }

  /**
   * A table with the label in its own left column and the value in the right one (Attendance
   * Regularization style). A row with `cells` splits the value column into label/value pairs.
   */
  labelTable(rows: FormRow[], labelColumnWidth = 120): void {
    const valueWidth = this.contentWidth - labelColumnWidth;
    for (const row of rows) {
      const cells = 'cells' in row ? row.cells : [row];
      const pairWidth = this.contentWidth / cells.length;
      const pairLabelWidth = cells.length === 1 ? labelColumnWidth : pairWidth / 2;
      const pairValueWidth = cells.length === 1 ? valueWidth : pairWidth / 2;
      const height = Math.max(
        ...cells.map((cell) => this.cellHeight(cell, pairValueWidth, 0)),
        this.wrap(cells[0].label, this.bold, this.size, pairLabelWidth - this.pad * 2).length *
          this.lineHeight +
          14,
      );
      this.ensureSpace(height);
      cells.forEach((cell, i) => {
        const x = this.margin + i * pairWidth;
        this.drawBox(x, pairLabelWidth, height);
        this.drawBox(x + pairLabelWidth, pairValueWidth, height);
        this.wrap(cell.label, this.bold, this.size, pairLabelWidth - this.pad * 2).forEach(
          (line, li) => {
            this.page.drawText(line, {
              x: x + this.pad,
              y: this.y - 8 - this.size - li * this.lineHeight,
              size: this.size,
              font: this.bold,
            });
          },
        );
        this.drawValue(cell, x + pairLabelWidth + this.pad, pairValueWidth - this.pad * 2);
      });
      this.y -= height;
    }
  }

  /**
   * A signature line: the typed signature (or plain value) above a rule, caption labels below.
   * Draws at `x` without moving `y`, so several can sit side by side; returns the height used.
   */
  signatureLine(
    x: number,
    width: number,
    opts: { signature?: string | null; value?: string | null; captions: string[] },
  ): number {
    const lineY = this.y - 26;
    if (opts.signature) {
      this.page.drawText(this.safe(this.script, opts.signature), {
        x: x + 4,
        y: lineY + 5,
        size: 14,
        font: this.script,
        color: FORM_COLORS.ink,
      });
    } else if (opts.value) {
      const valueWidth = this.regular.widthOfTextAtSize(
        this.safe(this.regular, opts.value),
        this.size,
      );
      this.page.drawText(this.safe(this.regular, opts.value), {
        x: x + (width - valueWidth) / 2,
        y: lineY + 5,
        size: this.size,
        font: this.regular,
      });
    }
    this.page.drawLine({ start: { x, y: lineY }, end: { x: x + width, y: lineY }, thickness: 0.6 });
    opts.captions.forEach((caption, i) => {
      const font = i === 0 ? this.bold : this.regular;
      const text = this.safe(font, caption);
      const size = i === 0 ? this.size : 7;
      this.page.drawText(text, {
        x: x + (width - font.widthOfTextAtSize(text, size)) / 2,
        y: lineY - 11 - i * 10,
        size,
        font,
        color: i === 0 ? rgb(0, 0, 0) : FORM_COLORS.grey,
      });
    });
    return 26 + 11 + opts.captions.length * 10;
  }

  /** A radio-style option: an outlined circle (filled when chosen) and its wrapped label. */
  option(checked: boolean, label: string): void {
    const lines = this.wrap(label, this.regular, this.size, this.contentWidth - 30);
    const height = Math.max(20, lines.length * this.lineHeight + 8);
    this.ensureSpace(height);
    const cx = this.margin + 8;
    const cy = this.y - 9;
    this.page.drawEllipse({
      x: cx,
      y: cy,
      xScale: 7,
      yScale: 8,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    if (checked) {
      this.page.drawCircle({ x: cx, y: cy, size: 4, color: rgb(0, 0, 0) });
    }
    lines.forEach((line, i) => {
      this.page.drawText(line, {
        x: this.margin + 24,
        y: this.y - 12 - i * this.lineHeight,
        size: this.size,
        font: this.regular,
      });
    });
    this.y -= height + 4;
  }

  /** A shaded, centred note box. `atBottom` pins it just above the footer, as on the paper forms. */
  noteBox(note: string, atBottom = false): void {
    const lines = this.wrap(note, this.bold, 8, this.contentWidth - 40);
    const height = lines.length * 11 + 12;
    this.ensureSpace(height);
    if (atBottom) this.y = Math.min(this.y, this.margin + 40 + height);
    this.drawBox(this.margin, this.contentWidth, height, FORM_COLORS.headerFill);
    lines.forEach((line, i) => {
      this.page.drawText(line, {
        x: this.margin + (this.contentWidth - this.bold.widthOfTextAtSize(line, 8)) / 2,
        y: this.y - 14 - i * 11,
        size: 8,
        font: this.bold,
      });
    });
    this.y -= height + 12;
  }

  /** Saves the document, stamping `footer` (with a page-number box) on every page if given. */
  async save(footer?: { text: string; boxColor: RGB }): Promise<Uint8Array> {
    if (footer) {
      const { margin } = this;
      const right = BnwFormPdf.pageWidth - margin;
      this.pages.forEach((p, i) => {
        const footerY = margin - 10;
        p.drawLine({
          start: { x: margin, y: footerY + 14 },
          end: { x: right, y: footerY + 14 },
          thickness: 0.5,
          color: FORM_COLORS.grey,
        });
        p.drawText(footer.text, {
          x: right - 40 - this.bold.widthOfTextAtSize(footer.text, 8),
          y: footerY,
          size: 8,
          font: this.bold,
          color: FORM_COLORS.grey,
        });
        p.drawRectangle({
          x: right - 36,
          y: footerY - 4,
          width: 36,
          height: 16,
          color: footer.boxColor,
        });
        p.drawText(String(i + 1), { x: right - 30, y: footerY, size: 8, font: this.regular });
      });
    }
    return this.doc.save();
  }
}
