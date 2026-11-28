/**
 * Reporting managers (client request, Nov 2026): `managerId` is the main one (Team chart line,
 * PDFs) and `additionalManagerIds` the others. Every one of them has the same rights over the
 * employee — team views, notifications, and the manager step of their requests.
 */
type Managed = { managerId: number | null; additionalManagerIds?: number[] | null };

/** All of a person's reporting managers, main one first. */
export function managerIdsOf(user: Managed | null | undefined): number[] {
  if (!user) return [];
  const ids = [user.managerId, ...(user.additionalManagerIds ?? [])];
  return [...new Set(ids.filter((id): id is number => typeof id === 'number'))];
}

export function isManagerOf(user: Managed | null | undefined, userId: number): boolean {
  return managerIdsOf(user).includes(userId);
}

/**
 * Who may act on a request's manager step: the manager it was sent to plus the employee's other
 * reporting managers today.
 */
export function requestManagerIds(row: {
  managerId: number | null;
  employee?: Managed | null;
}): number[] {
  return [...new Set([...(row.managerId ? [row.managerId] : []), ...managerIdsOf(row.employee)])];
}

/** Raw SQL: `alias` (a users row) reports to the user in `param` (e.g. '$1'). */
export const reportsToSql = (alias: string, param: string): string =>
  `(${alias}.manager_id = ${param} OR ${param} = ANY(${alias}.additional_manager_ids))`;
