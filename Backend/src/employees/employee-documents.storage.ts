import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { diskStorage, FileFilterCallback } from 'multer';
import { Request } from 'express';

/**
 * Local disk storage for E-record uploads, per API_CONTRACT_SPRINT2.md "File storage":
 * `Backend/uploads/employee-documents/` (git-ignored), filename randomized server-side, original
 * name kept separately on the EmployeeDocument row.
 */
export const UPLOADS_ROOT_DIR = join(process.cwd(), 'uploads');
export const EMPLOYEE_DOCUMENTS_DIR = join(UPLOADS_ROOT_DIR, 'employee-documents');

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function ensureUploadDirExists(): void {
  if (!existsSync(EMPLOYEE_DOCUMENTS_DIR)) {
    mkdirSync(EMPLOYEE_DOCUMENTS_DIR, { recursive: true });
  }
}

export const employeeDocumentStorage = diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDirExists();
    cb(null, EMPLOYEE_DOCUMENTS_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname)}`);
  },
});

export function employeeDocumentFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
    cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`));
    return;
  }
  cb(null, true);
}
