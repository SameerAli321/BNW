import { Company } from './enums/company.enum';
import { RoleName } from './enums/role.enum';

/** Roles that work across both companies — they always see BNW and Hayes. */
const BOTH_COMPANIES_ROLES: string[] = [RoleName.CEO, RoleName.HR, RoleName.ADMIN];

/**
 * Hayes staff only see Hayes (and the shared HR / Administration team) on the company-wide pages:
 * the Team chart, the meeting invite list, announcements and About us (client checklist, Nov
 * 2026). Returns the companies this person may see, or null for "both" (BNW staff, the shared
 * team, CEO / HR / Admin).
 */
export function visibleCompanies(user: { role: string; company: string }): Company[] | null {
  if (BOTH_COMPANIES_ROLES.includes(user.role)) return null;
  return user.company === Company.HAYES ? [Company.HAYES, Company.SHARED] : null;
}

/** True for a Hayes employee who is limited to Hayes (see `visibleCompanies`). */
export const isHayesOnly = (user: { role: string; company: string }): boolean =>
  visibleCompanies(user) !== null;
