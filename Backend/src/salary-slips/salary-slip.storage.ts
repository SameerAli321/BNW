import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { UPLOADS_ROOT_DIR } from '../employees/employee-documents.storage';

/** Generated salary slip PDFs: `Backend/uploads/salary-slips/` (git-ignored with uploads/). */
export const SALARY_SLIPS_DIR = join(UPLOADS_ROOT_DIR, 'salary-slips');

export function ensureSalarySlipsDirExists(): void {
  if (!existsSync(SALARY_SLIPS_DIR)) {
    mkdirSync(SALARY_SLIPS_DIR, { recursive: true });
  }
}
