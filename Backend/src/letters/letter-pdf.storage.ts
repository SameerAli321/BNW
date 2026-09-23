import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { UPLOADS_ROOT_DIR } from '../employees/employee-documents.storage';

/**
 * Rendered letter PDFs land on local disk at `Backend/uploads/letters/` — same storage pattern/
 * root as Sprint 2's E-record uploads (already git-ignored via `uploads/`), per
 * docs/API_CONTRACT_SPRINT3.md.
 */
export const LETTERS_DIR = join(UPLOADS_ROOT_DIR, 'letters');

export function ensureLettersDirExists(): void {
  if (!existsSync(LETTERS_DIR)) {
    mkdirSync(LETTERS_DIR, { recursive: true });
  }
}
