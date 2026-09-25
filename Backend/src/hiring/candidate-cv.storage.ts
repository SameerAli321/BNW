import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { diskStorage, FileFilterCallback } from 'multer';
import { Request } from 'express';
import { MAX_DOCUMENT_SIZE_BYTES, UPLOADS_ROOT_DIR } from '../employees/employee-documents.storage';

/**
 * Local disk storage for candidate CV uploads, per API_CONTRACT_SPRINT5.md's bulk-upload endpoint
 * — same pattern as employee-documents.storage.ts, but PDF-only, and shares the same
 * MAX_DOCUMENT_SIZE_BYTES cap (10MB) per the contract's explicit "reuse" instruction.
 */
export const CANDIDATE_CVS_DIR = join(UPLOADS_ROOT_DIR, 'candidate-cvs');

export { MAX_DOCUMENT_SIZE_BYTES };

export const ALLOWED_CV_MIME_TYPES = ['application/pdf'];

function ensureUploadDirExists(): void {
  if (!existsSync(CANDIDATE_CVS_DIR)) {
    mkdirSync(CANDIDATE_CVS_DIR, { recursive: true });
  }
}

export const candidateCvStorage = diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDirExists();
    cb(null, CANDIDATE_CVS_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname)}`);
  },
});

export function candidateCvFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  if (!ALLOWED_CV_MIME_TYPES.includes(file.mimetype)) {
    cb(new BadRequestException(`Unsupported file type: ${file.mimetype} — PDF only`));
    return;
  }
  cb(null, true);
}
