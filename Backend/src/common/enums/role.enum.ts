export enum RoleName {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  HR = 'HR',
  CEO = 'CEO',
  PAYROLL = 'PAYROLL',
  ADMIN = 'ADMIN',
  // Shown as "Manager" — MANAGER itself is shown as "Team Lead".
  LINE_MANAGER = 'LINE_MANAGER',
  PARTNER = 'PARTNER',
}

export const ALL_ROLES: RoleName[] = [
  RoleName.EMPLOYEE,
  RoleName.MANAGER,
  RoleName.HR,
  RoleName.CEO,
  RoleName.PAYROLL,
  RoleName.ADMIN,
  RoleName.LINE_MANAGER,
  RoleName.PARTNER,
];

/**
 * Roles that lead people: Team Lead (MANAGER), Manager (LINE_MANAGER) and Partner. Each sees only
 * themselves and the people reporting to them (users.manager_id) — no company-wide pages or other
 * employees' records (client decision, Nov 2026).
 */
export const TEAM_LEAD_ROLES: RoleName[] = [
  RoleName.MANAGER,
  RoleName.LINE_MANAGER,
  RoleName.PARTNER,
];

export const isTeamLeadRole = (role: string): boolean =>
  (TEAM_LEAD_ROLES as string[]).includes(role);
