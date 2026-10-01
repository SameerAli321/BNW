import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { diskStorage, FileFilterCallback } from 'multer';
import { Request } from 'express';
import { UPLOADS_ROOT_DIR } from '../employees/employee-documents.storage';

/** Receipts (reimbursement) and quotations (equipment) — same pattern as the other upload stores. */
export const WORK_ORDER_RECEIPTS_DIR = join(UPLOADS_ROOT_DIR, 'work-order-receipts');

export const MAX_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const ALLOWED_RECEIPT_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

export const receiptStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(WORK_ORDER_RECEIPTS_DIR))
      mkdirSync(WORK_ORDER_RECEIPTS_DIR, { recursive: true });
    cb(null, WORK_ORDER_RECEIPTS_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
  },
});

export function receiptFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  if (!ALLOWED_RECEIPT_MIME_TYPES.includes(file.mimetype)) {
    cb(new BadRequestException('The receipt must be a PDF or an image (JPG, PNG, WEBP)'));
    return;
  }
  cb(null, true);
}
