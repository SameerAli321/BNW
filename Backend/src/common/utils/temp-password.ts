import { randomBytes } from 'crypto';

/**
 * Generates a readable temporary password for newly-created users, e.g. "Xk7m-Tq2p-9Rvw".
 * Sent (stubbed for now — see UsersService.create) to the user, who must change it on first login.
 */
export function generateTempPassword(): string {
  const chunk = () => randomBytes(3).toString('hex').toUpperCase();
  return `${chunk()}-${chunk()}-${chunk()}`;
}
