import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { BadRequestException } from '@nestjs/common';
import { diskStorage, FileFilterCallback } from 'multer';
import { Request } from 'express';
import { UPLOADS_ROOT_DIR } from '../employees/employee-documents.storage';

/**
 * Local disk storage for profile pictures — same pattern as employee-documents.storage.ts.
 * Files get a random UUID name, so a new upload always has a new URL (no stale browser cache)
 * and the URL can't be guessed, which is what lets the image route be public (an <img> tag
 * can't send the Bearer token).
 */
export const AVATARS_DIR = join(UPLOADS_ROOT_DIR, 'avatars');

export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

const AVATAR_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/** Only names this storage produces — guards the public route against path tricks. */
export const AVATAR_FILE_NAME_PATTERN = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

export const avatarStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(AVATARS_DIR)) mkdirSync(AVATARS_DIR, { recursive: true });
    cb(null, AVATARS_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${AVATAR_EXTENSIONS[file.mimetype] ?? '.jpg'}`);
  },
});

export function avatarFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  if (!AVATAR_EXTENSIONS[file.mimetype]) {
    cb(new BadRequestException('Profile picture must be a JPG, PNG or WEBP image'));
    return;
  }
  cb(null, true);
}
